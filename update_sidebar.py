import glob

search_str = '<a href="expenses.html" class="nav-link active" style="padding-left: 3rem; font-size: 0.95em;"><i class="fas fa-file-invoice-dollar"></i> Expenses</a>'
replace_str = '<a href="expenses.html" class="nav-link active" style="padding-left: 3rem; font-size: 0.95em;"><i class="fas fa-file-invoice-dollar"></i> Expenses</a>\n                <a href="incomes.html" class="nav-link " style="padding-left: 3rem; font-size: 0.95em;"><i class="fas fa-coins"></i> Income</a>'

for file_path in glob.glob('templates/*.html'):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if search_str in content:
        content = content.replace(search_str, replace_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
