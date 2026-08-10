import glob

for filename in glob.glob('templates/*.html'):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the exact string
    content = content.replace('src="/static/assets/js/script.js"', 'src="/static/assets/js/script.js?v={{ range(1, 100000) | random }}"')
    content = content.replace('src="/static/assets/js/script.js?v=6"', 'src="/static/assets/js/script.js?v={{ range(1, 100000) | random }}"')
    
    # Same for CSS just in case
    content = content.replace('href="/static/assets/css/style.css"', 'href="/static/assets/css/style.css?v={{ range(1, 100000) | random }}"')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
print("Done")
