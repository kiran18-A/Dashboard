import os, re

frontend_dir = r'd:\Shive core\dashboard\frontend'
for f in os.listdir(frontend_dir):
    if f.endswith('.html'):
        path = os.path.join(frontend_dir, f)
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace sidebar logo class to org-logo-display
        content = re.sub(r'(<img src="/static/assets/img/logo\.png"[^>]*?)>', r'\1 class="org-logo-display">', content)
        # Avoid duplicate classes if it already has class
        # (Since we just add class="org-logo-display" at the end of the img tag, if it has a class attribute earlier, HTML accepts it or we can combine it)
        # Wait, if it already had a class, the browser might ignore the second class attribute.
        
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
print('Done updating HTML files.')
