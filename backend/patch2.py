import os, glob

modal_html = """
    <!-- Edit Day Modal -->
    <div class="modal fade" id="editDayModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content glass-card border-0 shadow-lg">
                <div class="modal-header border-bottom border-secondary">
                    <h5 class="modal-title fw-bold text-primary"><i class="fas fa-edit me-2"></i>Edit Day Status</h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 text-dark" style="background-color: white; border-radius: 0 0 1rem 1rem;">
                    <form id="editDayForm">
                        <input type="hidden" id="editDayDate">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-semibold">Selected Date</label>
                            <input type="text" class="form-control" id="editDayDateDisplay" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-semibold">Status</label>
                            <select class="form-select" id="editDayType">
                                <option value="Holiday">Holiday</option>
                                <option value="Working Day">Working Day</option>
                                <option value="Default">Reset to Default</option>
                            </select>
                        </div>
                        <div class="mb-3" id="editDayNameContainer">
                            <label class="form-label text-muted small fw-semibold">Name / Occasion</label>
                            <input type="text" class="form-control" id="editDayName" placeholder="e.g. Diwali">
                        </div>
                        <div class="text-end mt-4">
                            <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
"""

for filepath in glob.glob('d:/Shive core/dashboard/frontend/*.html'):
    if 'login.html' in filepath or 'index.html' in filepath:
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'editDayModal' in content:
        continue
        
    # Inject modal
    content = content.replace('</body>', f'{modal_html}\n</body>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print('Done patching HTML files for editDayModal.')
