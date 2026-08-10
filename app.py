from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pandas as pd
import os
from datetime import datetime, date
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-for-dashboard'
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
        'leaves': pd.DataFrame(columns=['id', 'emp_id', 'start_date', 'end_date', 'reason', 'status']),
        'documents': pd.DataFrame(columns=['id', 'emp_id', 'doc_type', 'filename', 'upload_date']),
        'incomes': pd.DataFrame(columns=['id', 'name', 'source', 'amount', 'date', 'status'])
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
        
        # Get profile photo
        if 'user_id' in session:
            users_df = read_excel_cached(get_db_path('users'))
            if not users_df.empty and 'profile_photo' in users_df.columns:
                u_row = users_df[users_df['id'] == session.get('user_id')]
                if not u_row.empty:
                    p_photo = u_row.iloc[0].get('profile_photo')
                    if p_photo and str(p_photo) != 'nan':
                        context['profile_photo'] = f"/static/uploads/profiles/{p_photo}"
                        
        if page in ['profile', 'employee-dashboard'] and 'user_id' in session:
            emp_df = read_excel_cached(get_db_path('employees'))
            emp_df = emp_df.fillna('')
            # Find employee either by numeric ID (users table link) or employee_id
            emp = emp_df[(emp_df['name'] == session.get('name')) | (emp_df['employee_id'] == session.get('user_id'))]
            if not emp.empty:
                emp_row = emp.iloc[0]
                # Dynamically get assigned projects
                proj_df = read_excel_cached(get_db_path('projects')).fillna('')
                active_projects = proj_df[~proj_df['status'].isin(['Completed', 'Closed'])]
                my_projs = active_projects[active_projects['team'].astype(str).str.contains(session.get('name', ''), na=False, case=False)]
                assigned_projects = ", ".join(my_projs['name'].tolist()) if not my_projs.empty else 'None'
                # Calculate days worked this month
                att_df = read_excel_cached(get_db_path('attendance')).fillna('')
                days_worked = 0
                if not att_df.empty and 'user_id' in att_df.columns:
                    current_month = datetime.now().strftime('%Y-%m')
                    my_att = att_df[(att_df['user_id'] == session.get('user_id'))]
                    if not my_att.empty:
                        # Filter by date starting with YYYY-MM
                        month_att = my_att[my_att['date'].astype(str).str.startswith(current_month)]
                        # Get unique dates where status was Present
                        days_worked = month_att['date'].nunique()
                
                context.update({
                    'designation': emp_row.get('designation', 'N/A'),
                    'employee_id': emp_row.get('employee_id', 'N/A'),
                    'department': emp_row.get('department', 'N/A'),
                    'email': emp_row.get('email', 'N/A'),
                    'phone': emp_row.get('phone', 'N/A'),
                    'joining_date': emp_row.get('joining_date', 'N/A'),
                    'status': emp_row.get('status', 'Active'),
                    'current_project': assigned_projects,
                    'emergency_number': emp_row.get('emergency_number', 'N/A'),
                    'days_worked_month': days_worked
                })
            else:
                u_email = 'admin@itcorp.com'
                u_phone = 'N/A'
                u_emer = 'N/A'
                if 'users_df' in locals() and not users_df.empty:
                    u_row_match = users_df[users_df['id'] == session.get('user_id')]
                    if not u_row_match.empty:
                        u_email = u_row_match.iloc[0].get('email', 'admin@itcorp.com')
                        u_phone = u_row_match.iloc[0].get('phone', 'N/A')
                        u_emer = u_row_match.iloc[0].get('emergency_number', 'N/A')
                        
                        if pd.isna(u_email) or str(u_email).strip() == '': u_email = 'admin@itcorp.com'
                        if pd.isna(u_phone) or str(u_phone).strip() == '': u_phone = 'N/A'
                        if pd.isna(u_emer) or str(u_emer).strip() == '': u_emer = 'N/A'

                context.update({
                    'designation': session.get('role', 'N/A').title(),
                    'employee_id': 'ADMIN-01' if session.get('role') == 'admin' else 'N/A',
                    'department': 'Administration' if session.get('role') == 'admin' else 'N/A',
                    'email': u_email,
                    'phone': u_phone,
                    'joining_date': 'N/A',
                    'status': 'Active',
                    'current_project': 'N/A',
                    'emergency_number': u_emer
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
        
        if str(user_row['role']) == 'employee':
            emp_df = read_excel_cached(get_db_path('employees')).fillna('')
            if not emp_df.empty:
                emp = emp_df[emp_df['name'] == str(user_row['name'])]
                if not emp.empty:
                    if str(emp.iloc[0].get('status', 'Active')).lower() == 'inactive':
                        return jsonify({'success': False, 'message': 'Your account is inactive. Please contact the administrator.'}), 403
                        
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

@app.route('/api/my_status', methods=['GET'])
def get_my_status():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'checked_in': False})
    
    today_str = str(date.today())
    att_df = read_excel_cached(get_db_path('attendance'))
    if not att_df.empty:
        mask = (att_df['user_id'] == user_id) & (att_df['date'].astype(str) == today_str)
        if mask.any():
            row = att_df[mask].iloc[-1]  # Get latest in case of multiple
            check_in = str(row.get('check_in', ''))
            check_out = str(row.get('check_out', ''))
            is_checked_in = (check_in and check_in != 'nan') and (not check_out or check_out == 'nan')
            return jsonify({
                'checked_in': is_checked_in,
                'check_in_time': check_in if check_in != 'nan' else '',
                'check_out_time': check_out if check_out != 'nan' else ''
            })
    return jsonify({'checked_in': False})

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
    
    # 1. Total Expenses
    total_expenses = 0
    if not exp_df.empty and 'amount' in exp_df.columns:
        # Sum of all expenses
        total_expenses = float(pd.to_numeric(exp_df['amount'], errors='coerce').fillna(0).sum())
        
    if not emp_df.empty and 'salary' in emp_df.columns and 'status' in emp_df.columns:
        # Add sum of active employee salaries
        active_salaries = pd.to_numeric(emp_df[emp_df['status'] == 'Active']['salary'], errors='coerce').fillna(0).sum()
        total_expenses += float(active_salaries)
        
    # 2. Total Income
    total_income = 0
    inc_df = read_excel_cached(get_db_path('incomes'))
    if not inc_df.empty and 'amount' in inc_df.columns:
        total_income = float(pd.to_numeric(inc_df['amount'], errors='coerce').fillna(0).sum())
    
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
        'total_expenses': total_expenses,
        'total_income': total_income,
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
            
            # Check eligibility: joined before or during this month, and is Active
            eligible = str(emp.get('status', 'Active')).strip() == 'Active'
            joining_date_str = str(emp.get('joining_date', ''))
            if joining_date_str and joining_date_str != 'nan':
                try:
                    join_dt = datetime.strptime(joining_date_str, '%Y-%m-%d')
                    now = datetime.now()
                    if (join_dt.year, join_dt.month) > (now.year, now.month):
                        eligible = False
                except ValueError:
                    pass
            
            has_record = False
            if not sal_df.empty:
                has_record = ((sal_df['employee_id'] == emp_id) & (sal_df['month'] == current_month)).any()
                
            if not has_record and emp['name'] and eligible:
                raw_sal = emp.get('salary')
                sal_val = float(raw_sal) if pd.notna(raw_sal) and str(raw_sal).strip() != '' else 5000.0
                new_records.append({
                    'id': new_id,
                    'employee_id': emp_id,
                    'amount': sal_val,
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
            
    # Sync "Pending" salaries with live employee data
    if not sal_df.empty and not emp_df.empty:
        # Create a dictionary of employee_id to live salary
        emp_salaries = {}
        for _, emp in emp_df.iterrows():
            raw_sal = emp.get('salary')
            sal_val = float(raw_sal) if pd.notna(raw_sal) and str(raw_sal).strip() != '' else 5000.0
            emp_salaries[emp['employee_id']] = sal_val
            
        # Update Pending salaries
        updated = False
        for i, row in sal_df.iterrows():
            if row['status'] == 'Pending' and row['employee_id'] in emp_salaries:
                live_sal = emp_salaries[row['employee_id']]
                if float(row['amount']) != live_sal:
                    sal_df.at[i, 'amount'] = live_sal
                    updated = True
                    
        if updated:
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

@app.route('/api/salary/<int:salary_id>', methods=['PUT'])
def update_salary(salary_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    sal_df = read_excel_cached(get_db_path('salary'))
    
    if not sal_df.empty:
        mask = sal_df['id'] == salary_id
        if mask.any():
            if 'amount' in data:
                sal_df.loc[mask, 'amount'] = float(data['amount'])
            if 'status' in data:
                sal_df['status'] = sal_df['status'].astype(str)
                sal_df.loc[mask, 'status'] = str(data['status'])
                
                if 'paid_date' not in sal_df.columns:
                    sal_df['paid_date'] = ''
                sal_df['paid_date'] = sal_df['paid_date'].astype(str)
                
                if data['status'] == 'Paid':
                    sal_df.loc[mask, 'paid_date'] = datetime.now().strftime('%b %d, %Y')
                else:
                    sal_df.loc[mask, 'paid_date'] = ''
                    
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
        
        t_input = data.get('time')
        current_time = datetime.now().strftime('%I:%M %p')
        if t_input:
            try:
                current_time = datetime.strptime(t_input, '%H:%M').strftime('%I:%M %p')
            except:
                pass
                
        new_row = pd.DataFrame([{
            'id': new_id,
            'user_id': '',
            'emp_id': data.get('emp_id') or session.get('user_id', ''),
            'date': data.get('date') or datetime.now().strftime('%Y-%m-%d'),
            'time': current_time,
            'project': data.get('project', ''),
            'description': data.get('description', ''),
            'hours': '',
            'status': data.get('status') or 'Pending Review'
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
            role = session.get('role', '')
            # Pending statuses
            pending = df[~df['status'].isin(['Completed', 'Closed'])]
            
            if role == 'admin':
                my_projs = pending
            else:
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
    success = False
    
    # Update in users.xlsx
    users_path = get_db_path('users')
    if os.path.exists(users_path):
        udf = read_excel_cached(users_path)
        if not udf.empty:
            uidx = udf.index[udf['id'] == session.get('user_id')].tolist()
            if uidx:
                row_idx = uidx[0]
                for col in ['email', 'phone', 'emergency_number']:
                    if col not in udf.columns:
                        udf[col] = ''
                
                # Convert to object to avoid dtype warning
                for col in ['email', 'phone', 'emergency_number']:
                    udf[col] = udf[col].astype(object)
                
                if 'email' in data:
                    udf.at[row_idx, 'email'] = str(data['email'])
                if 'phone' in data:
                    udf.at[row_idx, 'phone'] = str(data['phone'])
                if 'emergency_number' in data:
                    udf.at[row_idx, 'emergency_number'] = str(data['emergency_number'])
                    
                udf.to_excel(users_path, index=False, engine='openpyxl')
                success = True

    # Update in employees.xlsx if applicable
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path)
        if not df.empty:
            idx = df.index[(df['name'] == session.get('name')) | (df['employee_id'] == session.get('user_id'))].tolist()
            if idx:
                row_idx = idx[0]
                for col in ['email', 'phone', 'emergency_number']:
                    if col not in df.columns:
                        df[col] = ''
                
                for col in ['email', 'phone', 'emergency_number']:
                    df[col] = df[col].astype(object)
                
                if 'email' in data:
                    df.at[row_idx, 'email'] = str(data['email'])
                if 'phone' in data:
                    df.at[row_idx, 'phone'] = str(data['phone'])
                if 'emergency_number' in data:
                    df.at[row_idx, 'emergency_number'] = str(data['emergency_number'])
                
                df.to_excel(path, index=False, engine='openpyxl')
                success = True

    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to update profile'}), 500


@app.route('/api/employees', methods=['GET'])
def get_employees():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('employees')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        
        # Calculate active project count for each employee
        proj_df = read_excel_cached(get_db_path('projects')).fillna('')
        active_projects = proj_df[~proj_df['status'].isin(['Completed', 'Closed'])]
        
        def count_projects(emp_name):
            if not emp_name: return 0
            return len(active_projects[active_projects['team'].astype(str).str.contains(str(emp_name), na=False, case=False)])
            
        df['project_count'] = df['name'].apply(count_projects)
        
        # Add username from users.xlsx
        users_df = read_excel_cached(get_db_path('users')).fillna('')
        if not users_df.empty and 'username' in users_df.columns and 'name' in users_df.columns:
            name_to_username = dict(zip(users_df['name'], users_df['username']))
            name_to_userid = dict(zip(users_df['name'], users_df['id']))
            df['username'] = df['name'].map(name_to_username).fillna('Not set')
            df['user_id'] = df['name'].map(name_to_userid)
        else:
            df['username'] = 'Not set'
            df['user_id'] = None
            
        # Add pending leave data
        leaves_df = read_excel_cached(get_db_path('leaves')).fillna('')
        if not leaves_df.empty and 'emp_id' in leaves_df.columns and 'status' in leaves_df.columns:
            pending_leaves = leaves_df[leaves_df['status'].astype(str).str.lower() == 'pending']
            
            def get_pending_leave(u_id):
                if pd.isna(u_id): return None
                emp_leaves = pending_leaves[pending_leaves['emp_id'].astype(str) == str(int(u_id))]
                if not emp_leaves.empty:
                    leave = emp_leaves.iloc[0].to_dict()
                    return leave
                return None
                
            df['pending_leave'] = df['user_id'].apply(get_pending_leave)
        else:
            df['pending_leave'] = None
            
        # Add is_present_today flag
        att_df = read_excel_cached(get_db_path('attendance')).fillna('')
        today_str = str(date.today())
        if not att_df.empty and 'emp_id' in att_df.columns and 'date' in att_df.columns:
            today_att = att_df[att_df['date'] == today_str]
            def check_presence(emp_id):
                emp_att = today_att[today_att['emp_id'].astype(str) == str(emp_id)]
                if not emp_att.empty:
                    # They have a record for today. Let's say if they have any record, they logged in.
                    return True
                return False
            df['is_present_today'] = df['employee_id'].apply(check_presence)
        else:
            df['is_present_today'] = False
        
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
        
        # Dynamically get assigned projects
        proj_df = read_excel_cached(get_db_path('projects')).fillna('')
        active_projects = proj_df[~proj_df['status'].isin(['Completed', 'Closed'])]
        my_projs = active_projects[active_projects['team'].astype(str).str.contains(emp_data.get('name', ''), na=False, case=False)]
        emp_data['current_project'] = ", ".join(my_projs['name'].tolist()) if not my_projs.empty else 'None'

        
        # Get attendance
        att_df = read_excel_cached(get_db_path('attendance')).fillna('')
        att_data = att_df[att_df['emp_id'] == emp_data.get('employee_id')].to_dict('records')
        
        # Get work
        work_df = read_excel_cached(get_db_path('daily_work')).fillna('')
        work_data = work_df[work_df['emp_id'] == emp_data.get('employee_id')].to_dict('records')
        
        # Get documents
        # First find the user_id for this employee name
        users_df = read_excel_cached(get_db_path('users')).fillna('')
        user_id = None
        if not users_df.empty and 'name' in users_df.columns and 'id' in users_df.columns:
            matching_users = users_df[users_df['name'] == emp_data.get('name', '')]
            if not matching_users.empty:
                user_id = matching_users.iloc[0]['id']
                
        doc_data = []
        if user_id is not None:
            doc_df = read_excel_cached(get_db_path('documents')).fillna('')
            if not doc_df.empty:
                doc_data = doc_df[doc_df['emp_id'].astype(str) == str(user_id)].to_dict('records')
        
        return jsonify({
            'profile': emp_data,
            'attendance': att_data,
            'work': work_data,
            'documents': doc_data
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

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('expenses'))
        if not df.empty:
            mask = df['id'] == expense_id
            if mask.any():
                if 'name' in data:
                    df['name'] = df['name'].astype(str)
                    df.loc[mask, 'name'] = str(data['name'])
                if 'amount' in data:
                    df.loc[mask, 'amount'] = float(data['amount'])
                if 'date' in data:
                    df['date'] = df['date'].astype(str)
                    df.loc[mask, 'date'] = str(data['date'])
                df.to_excel(get_db_path('expenses'), index=False, engine='openpyxl')
                return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Expense not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/incomes', methods=['GET'])
def get_incomes():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('incomes')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/incomes', methods=['POST'])
def add_income():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('incomes'))
        max_id = df['id'].max() if not df.empty and 'id' in df.columns else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        new_row = pd.DataFrame([{
            'id': new_id,
            'name': data.get('name', ''),
            'source': data.get('source', ''),
            'amount': data.get('amount', 0),
            'date': data.get('date', ''),
            'status': data.get('status', 'Received')
        }])
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(get_db_path('incomes'), index=False, engine='openpyxl')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/incomes/<int:income_id>', methods=['PUT'])
def update_income(income_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        df = read_excel_cached(get_db_path('incomes'))
        if not df.empty:
            mask = df['id'] == income_id
            if mask.any():
                if 'name' in data:
                    df['name'] = df['name'].astype(str)
                    df.loc[mask, 'name'] = str(data['name'])
                if 'amount' in data:
                    df.loc[mask, 'amount'] = float(data['amount'])
                if 'date' in data:
                    df['date'] = df['date'].astype(str)
                    df.loc[mask, 'date'] = str(data['date'])
                df.to_excel(get_db_path('incomes'), index=False, engine='openpyxl')
                return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Income not found'}), 404
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
        
        # Add employee name based on user_id/emp_id
        users_df = read_excel_cached(get_db_path('users')).fillna('')
        if not users_df.empty and 'id' in users_df.columns and 'name' in users_df.columns:
            id_to_name = dict(zip(users_df['id'].astype(str), users_df['name']))
            df['name'] = df['emp_id'].astype(str).map(id_to_name).fillna(df['emp_id'])
            
        return jsonify(df.to_dict('records'))
    return jsonify([])

@app.route('/api/leaves', methods=['GET'])
def get_all_leaves():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    path = get_db_path('leaves')
    if os.path.exists(path):
        df = read_excel_cached(path).fillna('')
        
        # Add employee name
        users_df = read_excel_cached(get_db_path('users')).fillna('')
        if not users_df.empty and 'id' in users_df.columns and 'name' in users_df.columns:
            id_to_name = dict(zip(users_df['id'].astype(str), users_df['name']))
            df['name'] = df['emp_id'].astype(str).map(id_to_name).fillna(df['emp_id'])
            
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
def update_status():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        item_id = data.get('id')
        status = data.get('status')
        table_type = data.get('type')
        
        valid_tables = ['employees', 'attendance', 'salary', 'projects', 'daily_work', 'clients', 'leaves']
        if table_type not in valid_tables:
            return jsonify({'error': 'Invalid table type'}), 400
            
        df = read_excel_cached(get_db_path(table_type))
        idx = df.index[df['id'] == item_id].tolist()
        if idx:
            df.at[idx[0], 'status'] = status
            df.to_excel(get_db_path(table_type), index=False, engine='openpyxl')
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
        review_text = data.get('review')
        df = read_excel_cached(get_db_path('daily_work'))
        
        # Ensure column exists
        if 'admin_review' not in df.columns:
            df['admin_review'] = ''
            
        idx = df.index[df['id'] == int(work_id)].tolist()
        if idx:
            df.at[idx[0], 'admin_review'] = review_text
            df.to_excel(get_db_path('daily_work'), index=False, engine='openpyxl')
            return jsonify({'success': True})
    except Exception as e:
        print(f"Error in review_work: {e}")
        pass
    return jsonify({'error': 'Failed'}), 500




@app.route('/api/upload-profile-photo', methods=['POST'])
def api_upload_profile_photo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    if 'photo' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
        
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(f"profile_{user_id}_{file.filename}")
        profile_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'profiles')
        os.makedirs(profile_dir, exist_ok=True)
        file_path = os.path.join(profile_dir, filename)
        file.save(file_path)
        
        # Save to users database
        db_path = get_db_path('users')
        df = read_excel_cached(db_path)
        if not df.empty:
            if 'profile_photo' not in df.columns:
                df['profile_photo'] = ''
            
            idx = df.index[df['id'] == user_id].tolist()
            if idx:
                df.at[idx[0], 'profile_photo'] = filename
                df.to_excel(db_path, index=False, engine='openpyxl')
                return jsonify({'success': True, 'photo_url': f"/static/uploads/profiles/{filename}"})
                
    return jsonify({'success': False, 'message': 'Upload failed'}), 500

@app.route('/api/upload-document', methods=['POST'])
def api_upload_document():
    user_id = session.get('user_id')
    if not user_id or session.get('role') != 'employee':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    if 'document' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
        
    file = request.files['document']
    doc_type = request.form.get('doc_type', 'Unknown')
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(f"{user_id}_{doc_type.replace(' ', '_')}_{file.filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Save to database
        db_path = get_db_path('documents')
        df = read_excel_cached(db_path)
        max_id = df['id'].max() if not df.empty else 0
        new_id = int(max_id) + 1 if pd.notna(max_id) else 1
        
        new_doc = pd.DataFrame([{
            'id': new_id,
            'emp_id': user_id,
            'doc_type': doc_type,
            'filename': filename,
            'upload_date': str(date.today())
        }])
        
        df = pd.concat([df, new_doc], ignore_index=True)
        df.to_excel(db_path, index=False, engine='openpyxl')
        
        return jsonify({'success': True, 'message': 'Document uploaded successfully'})
    return jsonify({'success': False, 'message': 'Upload failed'})

@app.route('/api/my-documents', methods=['GET'])
def api_my_documents_legacy():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify([])
        
    df = read_excel_cached(get_db_path('documents'))
    if df.empty:
        return jsonify([])
        
    my_docs = df[df['emp_id'].astype(str) == str(user_id)].fillna('')
    return jsonify(my_docs.to_dict('records'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
