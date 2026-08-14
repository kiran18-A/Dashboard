import os, glob

modal_html = """
    <!-- Global Calendar Modal -->
    <div class="modal fade" id="globalCalendarModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content glass-card border-0 shadow-lg">
                <div class="modal-header border-bottom border-secondary">
                    <h5 class="modal-title fw-bold text-primary"><i class="fas fa-calendar-alt me-2"></i>Company Calendar</h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 text-dark" style="background-color: white; border-radius: 0 0 1rem 1rem;">
                    <div id="globalCalendar"></div>
                </div>
            </div>
        </div>
    </div>
"""

calendar_btn = """<button class="btn btn-light rounded-circle shadow-sm" id="calendarToggle" data-bs-toggle="modal" data-bs-target="#globalCalendarModal" style="width: 40px; height: 40px;" title="View Calendar">
                    <i class="fas fa-calendar-alt text-primary"></i>
                </button>"""
                
fc_script = '<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js"></script>'

for filepath in glob.glob('d:/Shive core/dashboard/frontend/*.html'):
    if 'login.html' in filepath or 'index.html' in filepath:
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'globalCalendarModal' in content:
        continue
        
    # Inject script in head
    content = content.replace('</head>', f'    {fc_script}\n</head>')
    
    # Inject button
    theme_btn_idx = content.find('id="themeToggle"')
    if theme_btn_idx != -1:
        # find the <button tag before it
        start_tag = content.rfind('<button', 0, theme_btn_idx)
        if start_tag != -1:
            content = content[:start_tag] + calendar_btn + '\n                ' + content[start_tag:]
            
    # Inject modal
    content = content.replace('</body>', f'{modal_html}\n</body>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print('Done patching HTML files.')
