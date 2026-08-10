from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pandas as pd
import os
from datetime import datetime, date

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-for-dashboard'

DATA_DIR = 'data'
os.makedirs(DATA_DIR, exist_ok=True)

def get_db_path(name):
    return os.path.join(DATA_DIR, f'{name}.xlsx')

_df_cache = {}

def read_excel_cached(path):
    if not os.path.exists(path):
        return pd.DataFrame()
    mtime = os.path.getmtime(path)
    if path not in _df_cache or _df_cache[path]['mtime'] != mtime:
        _df_cache[path] = {
            'mtime': mtime,
            'df': pd.read_excel(path)
        }
    return _df_cache[path]['df'].copy()

def init_excel():
    files_to_create = {
        'users': pd.DataFrame({
            'id': [1],
            'username': ['admin'],
            'password': ['123'],
            'role': ['admin'],
            'name': ['Admin User']
        }),
        'employees': pd.DataFrame(columns=[
            'id', 'name', 'employee_id', 'department', 'designation', 
            'email', 'phone', 'joining_date', 'status', 'salary'
        ]),
        'attendance': pd.DataFrame(columns=['id', 'user_id', 'emp_id', 'date', 'check_in', 'check_out', 'status']),
        'daily_work': pd.DataFrame(columns=['id', 'emp_id', 'date', 'time', 'description', 'hours', 'status']),
        'projects': pd.DataFrame(columns=['id', 'name', 'client', 'team', 'status', 'deadline']),
        'clients': pd.DataFrame(columns=['id', 'name', 'company', 'email']),
        'salary': pd.DataFrame(columns=['id', 'employee_id', 'amount', 'month', 'status', 'paid_date']),
        'expenses': pd.DataFrame(columns=['id', 'name', 'category', 'amount', 'date', 'status']),
        'leaves': pd.DataFrame(columns=['id', 'emp_id', 'start_date', 'end_date', 'reason', 'status'])
    }
    
    for name, df in files_to_create.items():
        path = get_db_path(name)
        if not os.path.exists(path):
            df.to_excel(path, index=False, engine='openpyxl')

@app.before_request
def setup():
    if not hasattr(app, 'setup_done'):
        init_excel()
        app.setup_done = True

@app.route('/')
def index():
    return redirect(url_for('serve_page', page='login'))

@app.route('/<page>.html')
def serve_page(page):
    try:
        context = {'name': session.get('name', 'User')}
        if page in ['profile', 'employee-dashboard'] and 'user_id' in session:
            emp_df = read_excel_cached(get_db_path('employees'))
            emp_df = emp_df.fillna('')
            # Find employee either by numeric ID (users table link) or employee_id
            emp = emp_df[(emp_df['name'] == session.get('name')) | (emp_df['employee_id'] == session.get('user_id'))]
            if not emp.empty:
                emp_row = emp.iloc[0]
                context.update({
                    'designation': emp_row.get('designation', 'N/A'),
                    'employee_id': emp_row.get('employee_id', 'N/A'),
                    'department': emp_row.get('department', 'N/A'),
                    'email': emp_row.get('email', 'N/A'),
                    'phone': emp_row.get('phone', 'N/A'),
                    'joining_date': emp_row.get('joining_date', 'N/A'),
                    'status': emp_row.get('status', 'Active'),
                    'current_project': emp_row.get('current_project', 'E-Commerce'),
                    'emergency_number': emp_row.get('emergency_number', 'N/A')
                })
        return render_template(f'{page}.html', **context)
    except Exception as e:
        return f"Page not found: {page}.html", 404

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    users_df = read_excel_cached(get_db_path('users'))
    # Filter using string conversion to ensure types match
    user = users_df[(users_df['username'].astype(str) == str(username)) & (users_df['password'].astype(str) == str(password))]
    
    if not user.empty:
        user_row = user.iloc[0]
        session['user_id'] = int(user_row['id'])
        session['role'] = str(user_row['role'])
        session['name'] = str(user_row['name'])
        return jsonify({'success': True, 'role': str(user_row['role'])})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    today_str = str(date.today())
    att_df = read_excel_cached(get_db_path('attendance'))
    
    # Check if already checked in today
    if not att_df.empty:
        already = att_df[(att_df['user_id'] == user_id) & (att_df['date'].astype(str) == today_str)]
        if not already.empty:
            return jsonify({'success': False, 'message': 'Already checked in today'})
    
    # Get employee ID if available
    users_df = read_excel_cached(get_db_path('users'))
    user_row = users_df[users_df['id'] == user_id]
    emp_id = ''
    if not user_row.empty:
        user_name = user_row.iloc[0]['name']
        emp_df = read_excel_cached(get_db_path('employees'))
        emp_row = emp_df[emp_df['name'] == user_name]
        if not emp_row.empty:
            emp_id = emp_row.iloc[0]['employee_id']
            
    max_id = att_df['id'].max()
    new_id = int(max_id) + 1 if not att_df.empty and pd.notna(max_id) else 1
    new_row = {
        'id': new_id,
        'user_id': user_id,
        'emp_id': emp_id,
        'date': today_str,
        'check_in': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'check_out': '',
        'status': 'Present'
    }
    
    att_df = pd.concat([att_df, pd.DataFrame([new_row])], ignore_index=True)
    att_df.to_excel(get_db_path('attendance'), index=False, engine='openpyxl')
        
    return jsonify({'success': True, 'time': datetime.now().strftime("%I:%M %p")})

@app.route('/api/checkout', methods=['POST'])
def api_checkout():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
        
    today_str = str(date.today())
    att_df = read_excel_cached(get_db_path('attendance'))
    
    if not att_df.empty:
        # Find today's record for user
        mask = (att_df['user_id'] == user_id) & (att_df['date'].astype(str) == today_str)
        if mask.any():
            att_df.loc[mask, 'check_out'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            att_df.to_excel(get_db_path('attendance'), index=False, engine='openpyxl')
            return jsonify({'success': True, 'time': datetime.now().strftime("%I:%M %p")})
            
    return jsonify({'success': False, 'message': 'No check-in record found for today'})

@app.route('/api/attendance', methods=['GET'])
def get_attendance():

    if 'user_id' not in session:
        print("DEBUG my_daily_work: user_id NOT in session!")
        return jsonify([])
    emp_id = session['user_id']
    print(f"DEBUG my_daily_work: user_id is {emp_id}")
    df = read_excel_cached(get_db_path('daily_work'))
    if not df.empty:
        # Handle schema updates
        for col in ['emp_id', 'hours', 'status', 'time', 'project', 'admin_review']:
            if col not in df.columns:
                df[col] = ''
        
        my_work = df[df['emp_id'].astype(str) == str(emp_id)].copy()
        print(f"DEBUG my_daily_work: Filtered length is {len(my_work)}")
        my_work = my_work.fillna('')
        my_work = my_work.sort_values('id', ascending=False)
        return jsonify(my_work.to_dict('records'))
    return jsonify([])


@app.route('/api/admin/dashboard', methods=['GET'])
def get_admin_dashboard():
    # Load all relevant dataframes
    emp_df = read_excel_cached(get_db_path('employees'))
    att_df = read_excel_cached(get_db_path('attendance'))
    proj_df = read_excel_cached(get_db_path('projects'))
    exp_df = read_excel_cached(get_db_path('expenses'))
    client_df = read_excel_cached(get_db_path('clients'))
    
    # 1. Total Employees
    total_employees = len(emp_df[emp_df['status'] == 'Active']) if not emp_df.empty and 'status' in emp_df.columns else 0
    
    # 2. Present Today
    today_str = str(date.today())
    present_today = len(att_df[(att_df['date'] == today_str) & (att_df['status'] == 'Present')]) if not att_df.empty and 'date' in att_df.columns else 0
    
    # 3. Running Projects
    running_projects = len(proj_df[proj_df['status'] == 'Running']) if not proj_df.empty and 'status' in proj_df.columns else 0
    
    # 4. Total Clients
    total_clients = len(client_df) if not client_df.empty else 0
    
    # 5. Leads (Clients with status Lead)
    total_leads = len(client_df[client_df['status'] == 'Lead']) if not client_df.empty and 'status' in client_df.columns else 0
    
    # 6. Closed (Projects with status Completed or Closed)
    total_closed = len(proj_df[proj_df['status'].isin(['Completed', 'Closed'])]) if not proj_df.empty and 'status' in proj_df.columns else 0
    
    # 7. Expense Analysis
    expense_labels = []
    expense_data = []
    if not exp_df.empty and 'category' in exp_df.columns and 'amount' in exp_df.columns:
        # Fill NaN categories and sum
        exp_grouped = exp_df.groupby('category')['amount'].sum()
        for cat, amt in exp_grouped.items():
            if pd.notna(cat):
                expense_labels.append(str(cat))
                expense_data.append(float(amt))
                
    # 8. Project Status Breakdown
    project_labels = []
    project_data = []
    if not proj_df.empty and 'status' in proj_df.columns:
        proj_grouped = proj_df.groupby('status').size()
        for stat, count in proj_grouped.items():
            if pd.notna(stat):
                project_labels.append(str(stat))
                project_data.append(int(count))
                
    return jsonify({
        'total_employees': total_employees,
        'present_today': present_today,
        'running_projects': running_projects,
        'total_clients': total_clients,
        'total_leads': total_leads,
        'total_closed': total_closed,
        'expense_analysis': {
            'labels': expense_labels,
            'data': expense_data
        },
        'project_status': {
            'labels': project_labels,
            'data': project_data
        }
    })

@app.route('/api/clients', methods=['GET'])
def get_clients():
    try:
        df = read_excel_cached(get_db_path('clients')).fillna('')
        
        # Ensure new columns exist for backwards compatibility with older excel files
        required_columns = ['id', 'name', 'company', 'phone', 'email', 'project', 'status']
        for col in required_columns:
            if col not in df.columns:
                df[col] = ''
                
        # Calculate stats
        total_clients = len(df)
        lead_clients = len(df[df['status'] == 'Leads']) if 'status' in df.columns else 0
        active_clients = len(df[df['status'] == 'Active']) if 'status' in df.columns else 0
        completed_projects = len(df[df['status'] == 'Completed']) if 'status' in df.columns else 0
        
        return jsonify({
            'clients': df.to_dict('records'),
            'stats': {
                'total': total_clients,
                'leads': lead_clients,
                'active': active_clients,
                'completed_projects': completed_projects
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clients', methods=['POST'])
def add_client():
    try:
        data = request.json
        df = read_excel_cached(get_db_path('clients'))
        
        required_columns = ['id', 'name', 'company', 'phone', 'email', 'project', 'status']
        for col in required_columns:
            if col not in df.columns:
                df[col] = ''
                
        max_id = df['id'].max()
        new_id = int(max_id) + 1 if not df.empty and pd.notna(max_id) else 1
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'name': data.get('name', ''),
            'company': data.get('company', ''),
            'phone': data.get('phone', ''),
            'email': data.get('email', ''),
            'project': data.get('project', ''),
            'status': data.get('status', 'Leads')
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('clients'), index=False, engine='openpyxl')
        
        return jsonify({'success': True, 'client': new_row.to_dict('records')[0]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/salary', methods=['GET'])
def get_salary():
    sal_df = read_excel_cached(get_db_path('salary'))
    emp_df = read_excel_cached(get_db_path('employees'))
    
    current_month = datetime.now().strftime('%B %Y')
    
    # Ensure columns exist if file was created before
    if 'status' not in sal_df.columns:
        sal_df['status'] = 'Pending'
    if 'paid_date' not in sal_df.columns:
        sal_df['paid_date'] = ''
        
    sal_df = sal_df.fillna('')
    
    # Auto-generate missing salary records for the current month for all employees
    if not emp_df.empty:
        new_records = []
        max_id = sal_df['id'].max() if not sal_df.empty else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        current_month_first_day = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        for _, emp in emp_df.iterrows():
            emp_id = emp['employee_id']
            
            # Check eligibility: joined before 1st of this month
            eligible = True
            joining_date_str = str(emp.get('joining_date', ''))
            if joining_date_str and joining_date_str != 'nan':
                try:
                    join_dt = datetime.strptime(joining_date_str, '%Y-%m-%d')
                    if join_dt >= current_month_first_day:
                        eligible = False
                except ValueError:
                    pass
            
            has_record = False
            if not sal_df.empty:
                has_record = ((sal_df['employee_id'] == emp_id) & (sal_df['month'] == current_month)).any()
                
            if not has_record and emp['name'] and eligible:
                new_records.append({
                    'id': new_id,
                    'employee_id': emp_id,
                    'amount': float(emp.get('salary', 5000) or 5000),
                    'month': current_month,
                    'status': 'Pending',
                    'paid_date': ''
                })
                new_id += 1
                
        if new_records:
            new_df = pd.DataFrame(new_records)
            if sal_df.empty:
                sal_df = new_df
            else:
                sal_df = pd.concat([sal_df, new_df], ignore_index=True)
            sal_df.to_excel(get_db_path('salary'), index=False, engine='openpyxl')
            
    # Merge with employees to get names
    if not sal_df.empty and not emp_df.empty:
        merged = pd.merge(sal_df, emp_df[['employee_id', 'name']], on='employee_id', how='left')
        merged = merged.fillna('')
        return jsonify(merged.to_dict('records'))
        
    return jsonify([])

@app.route('/api/salary/<int:salary_id>/pay', methods=['POST'])
def pay_salary(salary_id):
    sal_df = read_excel_cached(get_db_path('salary'))
    
    if not sal_df.empty:
        if 'status' not in sal_df.columns:
            sal_df['status'] = 'Pending'
        if 'paid_date' not in sal_df.columns:
            sal_df['paid_date'] = ''
            
        mask = sal_df['id'] == salary_id
        if mask.any():
            sal_df.loc[mask, 'status'] = 'Paid'
            sal_df.loc[mask, 'paid_date'] = datetime.now().strftime('%b %d, %Y')
            sal_df.to_excel(get_db_path('salary'), index=False, engine='openpyxl')
            return jsonify({'success': True})
            
    return jsonify({'success': False, 'message': 'Salary record not found'}), 404


@app.route('/api/save_work', methods=['POST'])
def save_daily_work():
    df = read_excel_cached(get_db_path('daily_work'))
    emp_df = read_excel_cached(get_db_path('employees'))
    
    if request.method == 'POST':
        data = request.json
        max_id = df['id'].max()
        new_id = int(max_id) + 1 if not df.empty and pd.notna(max_id) else 1
        
        current_time = datetime.now().strftime('%I:%M %p')
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'user_id': '',
            'emp_id': session.get('user_id', ''),
            'date': datetime.now().strftime('%Y-%m-%d'),
            'time': current_time,
            'project': data.get('project', ''),
            'description': data.get('description', ''),
            'hours': float(data.get('hours', 0)) if data.get('hours') else '',
            'status': 'Pending Review'
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('daily_work'), index=False, engine='openpyxl')
        
        return jsonify({'success': True})

@app.route('/api/my_daily_work', methods=['GET'])
def my_daily_work():
    if 'user_id' not in session:
        return jsonify([])
    emp_id = session['user_id']
    df = read_excel_cached(get_db_path('daily_work'))
    if not df.empty:
        # Handle schema updates
        for col in ['emp_id', 'hours', 'status', 'time', 'project', 'admin_review']:
            if col not in df.columns:
                df[col] = ''
        
        my_work = df[df['emp_id'].astype(str) == str(emp_id)].copy()
        my_work = my_work.fillna('')
        my_work = my_work.sort_values('id', ascending=False)
        return jsonify(my_work.to_dict('records'))
    return jsonify([])

@app.route('/api/my_leaves', methods=['GET'])
def my_leaves():
    if 'user_id' not in session:
        return jsonify([])
    emp_id = session['user_id']
    path = get_db_path('leaves')
    if os.path.exists(path):
        df = read_excel_cached(path)
        if not df.empty:
            my_leaves = df[df['emp_id'].astype(str) == str(emp_id)].copy()
            my_leaves = my_leaves.fillna('')
            my_leaves = my_leaves.sort_values('id', ascending=False)
            return jsonify(my_leaves.to_dict('records'))
    return jsonify([])

@app.route('/api/edit_my_work', methods=['POST'])
def edit_my_work():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    work_id = data.get('id')
    new_desc = data.get('description')
    
    if not work_id:
        return jsonify({'error': 'Work ID is required'}), 400
        
    df = read_excel_cached(get_db_path('daily_work'))
    if not df.empty:
        # Ensure schema
        for col in ['emp_id', 'hours', 'status', 'time', 'project', 'admin_review']:
            if col not in df.columns:
                df[col] = ''
                
        # Check ownership
        idx = df.index[df['id'] == int(work_id)].tolist()
        if idx:
            row_idx = idx[0]
            if str(df.at[row_idx, 'emp_id']) != str(session['user_id']):
                return jsonify({'error': 'Unauthorized to edit this record'}), 403
                
            df.at[row_idx, 'description'] = new_desc
            df.at[row_idx, 'status'] = 'Pending Review'
            df.at[row_idx, 'admin_review'] = ''
            
            df.to_excel(get_db_path('daily_work'), index=False, engine='openpyxl')
            return jsonify({'success': True})
            
    return jsonify({'error': 'Record not found'}), 404




@app.route('/api/update_employee_status', methods=['POST'])
def update_employee_status():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    new_status = data.get('status')
    new_project = data.get('project')
    
    if not new_status and not new_project:
        return jsonify({'error': 'No updates provided'}), 400
        
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path)
        if not df.empty:
            idx = df.index[(df['name'] == session.get('name')) | (df['employee_id'].astype(str) == str(session.get('user_id')))].tolist()
            if idx:
                row_idx = idx[0]
                if new_status:
                    df.at[row_idx, 'status'] = new_status
                if new_project:
                    if 'current_project' not in df.columns:
                        df['current_project'] = ''
                    df.at[row_idx, 'current_project'] = new_project
                
                df.to_excel(path, index=False, engine='openpyxl')
                return jsonify({'success': True})
            return jsonify({'error': 'Employee not found'}), 404
    return jsonify({'error': 'Database not found'}), 500


@app.route('/api/my_pending_projects', methods=['GET'])
def my_pending_projects():
    if 'user_id' not in session:
        return jsonify([])
        
    path = get_db_path('projects')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        if not df.empty:
            # Filter where status is NOT Completed/Closed and user name is in team
            # Note: session['name'] has the employee's name (e.g. Kiran)
            user_name = session.get('name', '')
            # Pending statuses
            pending = df[~df['status'].isin(['Completed', 'Closed'])]
            # Team includes user
            my_projs = pending[pending['team'].astype(str).str.contains(user_name, na=False, case=False)]
            
            res = my_projs[['id', 'name', 'status']].to_dict('records')
            return jsonify(res)
    return jsonify([])

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path)
        if not df.empty:
            idx = df.index[(df['name'] == session.get('name')) | (df['employee_id'] == session.get('user_id'))].tolist()
            if idx:
                row_idx = idx[0]
                
                # Check for new columns
                for col in ['email', 'phone', 'emergency_number']:
                    if col not in df.columns:
                        df[col] = ''
                
                if 'email' in data:
                    df.at[row_idx, 'email'] = data['email']
                if 'phone' in data:
                    df.at[row_idx, 'phone'] = data['phone']
                if 'emergency_number' in data:
                    df.at[row_idx, 'emergency_number'] = data['emergency_number']
                
                df.to_excel(path, index=False, engine='openpyxl')
                return jsonify({'success': True})
    return jsonify({'error': 'Failed to update profile'}), 500


@app.route('/api/employees', methods=['GET'])
def get_employees():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/employees', methods=['POST'])
def add_employee():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('employees'))
        max_id = df['id'].max() if not df.empty and 'id' in df.columns else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'name': data.get('name', ''),
            'employee_id': data.get('employee_id', ''),
            'department': data.get('department', ''),
            'designation': data.get('designation', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'joining_date': data.get('joining_date', ''),
            'status': data.get('status', 'Active'),
            'salary': data.get('salary', 0)
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('employees'), index=False, engine='openpyxl')
        
        if data.get('username') and data.get('password'):
            users_df = read_excel_cached(get_db_path('users'))
            user_max = users_df['id'].max() if not users_df.empty else 0
            user_new_id = int(user_max) + 1 if pd.notna(user_max) else 1
            new_user = pd.DataFrame([{
                'id': user_new_id,
                'username': data.get('username'),
                'password': data.get('password'),
                'role': 'employee',
                'name': data.get('name', '')
            }])
            users_df = pd.concat([users_df, new_user], ignore_index=True)
            users_df.to_excel(get_db_path('users'), index=False, engine='openpyxl')
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<int:emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path)
        df = df[df['id'] != emp_id]
        df.to_excel(path, index=False, engine='openpyxl')
        return jsonify({'success': True})
    return jsonify({'error': 'Failed'}), 500

@app.route('/api/employees/<int:emp_id>', methods=['PUT'])
def update_employee(emp_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path)
        idx = df.index[df['id'] == emp_id].tolist()
        if idx:
            row_idx = idx[0]
            for key in ['name', 'employee_id', 'department', 'designation', 'email', 'phone', 'joining_date', 'status', 'salary']:
                if key in data:
                    df.at[row_idx, key] = data[key]
            df.to_excel(path, index=False, engine='openpyxl')
            return jsonify({'success': True})
    return jsonify({'error': 'Failed'}), 500

@app.route('/api/employees/<int:emp_id>/details', methods=['GET'])
def get_employee_details(emp_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        emp_df = read_excel_cached(get_db_path('employees')).fillna('')
        emp = emp_df[emp_df['id'] == emp_id]
        if emp.empty:
            return jsonify({'error': 'Employee not found'}), 404
            
        emp_data = emp.iloc[0].to_dict()
        
        # Get attendance
        att_df = read_excel_cached(get_db_path('attendance')).fillna('')
        att_data = att_df[att_df['emp_id'] == emp_data.get('employee_id')].to_dict('records')
        
        # Get work
        work_df = read_excel_cached(get_db_path('daily_work')).fillna('')
        work_data = work_df[work_df['emp_id'] == emp_data.get('employee_id')].to_dict('records')
        
        return jsonify({
            'profile': emp_data,
            'attendance': att_data,
            'work': work_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['GET'])
def get_projects():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('projects')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('expenses')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('expenses'))
        max_id = df['id'].max() if not df.empty and 'id' in df.columns else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'name': data.get('name', ''),
            'amount': data.get('amount', 0),
            'date': data.get('date', ''),
            'category': 'General',
            'status': 'Approved'
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('expenses'), index=False, engine='openpyxl')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/all_work', methods=['GET'])
def get_all_work():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('daily_work')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/change_password', methods=['POST'])
def change_password():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400
        
    path = get_db_path('users')
    if os.path.exists(path):
        df = read_excel_cached(path)
        user_id = session.get('user_id')
        idx = df.index[df['id'] == user_id].tolist()
        if idx:
            row_idx = idx[0]
            df.at[row_idx, 'password'] = new_password
            df.to_excel(path, index=False, engine='openpyxl')
            return jsonify({'success': True})
    return jsonify({'error': 'User not found'}), 404



@app.route('/api/projects', methods=['POST'])
def add_project():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('projects'))
        max_id = df['id'].max() if not df.empty and 'id' in df.columns else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        team_val = data.get('team', '')
        if isinstance(team_val, list):
            team_val = ', '.join(team_val)
            
        new_row = pd.DataFrame([{
            'id': new_id,
            'name': data.get('name', ''),
            'client': data.get('client', ''),
            'team': team_val,
            'status': data.get('status', 'Running'),
            'deadline': data.get('deadline', '')
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('projects'), index=False, engine='openpyxl')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/daily_work', methods=['GET'])
def get_daily_work():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('daily_work')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/leaves', methods=['GET'])
def get_all_leaves():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('leaves')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/leaves', methods=['POST'])
def apply_leave():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('leaves'))
        max_id = df['id'].max() if not df.empty and 'id' in df.columns else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        emp_id = session.get('user_id') # Usually we get employee_id from session or from db
        # If user_id is the user table id, we need to map to employee_id if needed, but for simplicity:
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'emp_id': emp_id,
            'start_date': data.get('start_date', ''),
            'end_date': data.get('end_date', ''),
            'reason': data.get('reason', ''),
            'status': 'Pending'
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('leaves'), index=False, engine='openpyxl')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_status', methods=['POST'])
def update_leave_status():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        leave_id = data.get('id')
        status = data.get('status')
        df = read_excel_cached(get_db_path('leaves'))
        idx = df.index[df['id'] == leave_id].tolist()
        if idx:
            df.at[idx[0], 'status'] = status
            df.to_excel(get_db_path('leaves'), index=False, engine='openpyxl')
            return jsonify({'success': True})
    except Exception as e:
        pass
    return jsonify({'error': 'Failed'}), 500

@app.route('/api/review_work', methods=['POST'])
def review_work():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        work_id = data.get('id')
        status = data.get('status')
        df = read_excel_cached(get_db_path('daily_work'))
        idx = df.index[df['id'] == work_id].tolist()
        if idx:
            df.at[idx[0], 'status'] = status
            df.to_excel(get_db_path('daily_work'), index=False, engine='openpyxl')
            return jsonify({'success': True})
    except Exception as e:
        pass
    return jsonify({'error': 'Failed'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
