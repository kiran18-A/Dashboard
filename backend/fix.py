import re

with open('d:/Shive core/dashboard/frontend/assets/js/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Salary buttons
content = content.replace(
    '<button class="btn btn-sm btn-success text-white me-1 mark-paid-btn" data-id="${sal.id}"><i class="fas fa-check"></i> Mark Paid</button>',
    '<button class="btn btn-sm btn-outline-success me-1 mark-paid-btn" data-id="${sal.id}" title="Mark Paid"><i class="fas fa-check"></i></button>'
)
content = content.replace(
    '<button class="btn btn-sm btn-light text-primary view-salary-btn" data-empid="${sal.employee_id}" data-name="${sal.name || sal.employee_id}"><i class="fas fa-eye"></i> View</button>',
    '<button class="btn btn-sm btn-outline-info view-salary-btn me-1" data-empid="${sal.employee_id}" data-name="${sal.name || sal.employee_id}" title="View"><i class="fas fa-eye"></i></button>'
)
content = content.replace(
    '<button class="btn btn-sm btn-light text-primary edit-salary-btn ms-1" data-id="${sal.id}" data-amount="${amount}" data-status="${sal.status}" data-date="${formattedDate}"><i class="fas fa-edit"></i> Edit</button>',
    '<button class="btn btn-sm btn-outline-primary edit-salary-btn" data-id="${sal.id}" data-amount="${amount}" data-status="${sal.status}" data-date="${formattedDate}" title="Edit"><i class="fas fa-edit"></i></button>'
)

# Replace Employee Delete Button
content = content.replace(
    '<button class="btn btn-sm btn-light text-danger delete-emp-btn" data-id="${emp.id}"><i class="fas fa-trash"></i></button>',
    '<button class="btn btn-sm btn-outline-danger delete-emp-btn" data-id="${emp.id}" title="Delete"><i class="fas fa-trash"></i></button>'
)

# Replace Expense Buttons
content = content.replace(
    '<button class="btn btn-sm btn-light text-primary edit-expense-btn" data-id="${exp.id}" data-name="${exp.name || \'\'}" data-amount="${exp.amount || \'\'}" data-date="${exp.date || \'\'}"><i class="fas fa-edit"></i> Edit</button>',
    '<button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${exp.id}" data-name="${exp.name || \'\'}" data-amount="${exp.amount || \'\'}" data-date="${exp.date || \'\'}" title="Edit"><i class="fas fa-edit"></i></button>'
)

# Replace Income Buttons
content = content.replace(
    '<button class="btn btn-sm btn-light text-primary edit-income-btn" data-id="${inc.id}" data-name="${inc.name || \'\'}" data-amount="${inc.amount || \'\'}" data-date="${inc.date || \'\'}"><i class="fas fa-edit"></i> Edit</button>',
    '<button class="btn btn-sm btn-outline-primary edit-income-btn" data-id="${inc.id}" data-name="${inc.name || \'\'}" data-amount="${inc.amount || \'\'}" data-date="${inc.date || \'\'}" title="Edit"><i class="fas fa-edit"></i></button>'
)

# Replace Project Buttons
content = re.sub(
    r'<button class="btn btn-sm btn-light btn-action"\s*onclick=\'(openEditProjectModal\([^)]+\))\'><i class="fas fa-edit"></i></button>',
    r'<button class="btn btn-sm btn-outline-primary me-1" onclick=\'\1\' title="Edit"><i class="fas fa-edit"></i></button>',
    content
)
content = re.sub(
    r'<button class="btn btn-sm btn-light btn-action text-danger"\s*onclick="(deleteProject\([^)]+\))">',
    r'<button class="btn btn-sm btn-outline-danger" onclick="\1" title="Delete">',
    content
)

# Replace Client Buttons
content = re.sub(
    r'<button class="btn btn-sm btn-light btn-action"\s*onclick=\'(openEditClientModal\([^)]+\))\'><i class="fas fa-edit"></i></button>',
    r'<button class="btn btn-sm btn-outline-primary me-1" onclick=\'\1\' title="Edit"><i class="fas fa-edit"></i></button>',
    content
)
content = re.sub(
    r'<button class="btn btn-sm btn-light btn-action text-danger"\s*onclick="(deleteClient\([^)]+\))">',
    r'<button class="btn btn-sm btn-outline-danger" onclick="\1" title="Delete">',
    content
)

# Replace My Work Buttons
content = content.replace(
    '<button class="btn btn-sm btn-outline-primary shadow-sm"',
    '<button class="btn btn-sm btn-outline-primary"'
)

with open('d:/Shive core/dashboard/frontend/assets/js/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done updating buttons in script.js')
