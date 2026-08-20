import os, re

frontend_dir = r'd:\Shive core\dashboard\frontend'
for f in os.listdir(frontend_dir):
    if f.endswith('.html'):
        path = os.path.join(frontend_dir, f)
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace occurrences of Renvora Tech outside of tags/attributes
        content = re.sub(r'(?<!alt=")(?<!alt=\')Renvora Tech(?!")(?!\')', r'<span class="org-name-display">Renvora Tech</span>', content)
        # Fix double spanning if we accidentally did it
        content = content.replace('<span class="org-name-display"><span class="org-name-display">Renvora Tech</span></span>', '<span class="org-name-display">Renvora Tech</span>')
        
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
print('Done updating HTML files.')
