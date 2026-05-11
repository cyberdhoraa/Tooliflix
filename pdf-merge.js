// pdf-merge.js - Advanced PDF Merge Tool with Full Functionality
// This module provides robust PDF merging with progress tracking and error handling

class PDFMergeTool {
    constructor() {
        this.mergedDoc = null;
        this.filesList = [];
        this.progressCallback = null;
    }

    // Initialize new merge document
    async initMerge() {
        this.mergedDoc = await PDFLib.PDFDocument.create();
        this.filesList = [];
        return this;
    }

    // Add PDF file to merge list
    async addPDF(file, progressHandler = null) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            // Copy all pages
            const pages = await this.mergedDoc.copyPages(pdfDoc, 
                Array.from({ length: pageCount }, (_, i) => i)
            );
            
            // Add pages to merged document
            for (let page of pages) {
                this.mergedDoc.addPage(page);
                if (progressHandler) {
                    progressHandler(pageCount, this.filesList.length + 1);
                }
            }
            
            this.filesList.push({
                name: file.name,
                pages: pageCount,
                size: file.size
            });
            
            return { success: true, pages: pageCount };
        } catch (error) {
            console.error('Error adding PDF:', error);
            return { success: false, error: error.message };
        }
    }

    // Merge multiple PDFs
    async mergePDFs(files, onProgress = null) {
        try {
            await this.initMerge();
            
            for (let i = 0; i < files.length; i++) {
                const result = await this.addPDF(files[i], (pageCount, fileIndex) => {
                    if (onProgress) {
                        onProgress({
                            currentFile: i + 1,
                            totalFiles: files.length,
                            fileName: files[i].name,
                            pagesAdded: pageCount
                        });
                    }
                });
                
                if (!result.success) {
                    throw new Error(`Failed to process ${files[i].name}: ${result.error}`);
                }
            }
            
            // Save the merged PDF
            const pdfBytes = await this.mergedDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return {
                success: true,
                blob: blob,
                totalPages: this.getTotalPages(),
                filesMerged: this.filesList.length
            };
        } catch (error) {
            console.error('Merge failed:', error);
            return { success: false, error: error.message };
        }
    }

    getTotalPages() {
        return this.filesList.reduce((sum, file) => sum + file.pages, 0);
    }

    getFilesInfo() {
        return this.filesList;
    }
}

// Advanced UI Handler for PDF Merge
class PDFMergeUI {
    constructor() {
        this.setupUI();
    }

    setupUI() {
        // Create modal structure if not exists
        if (!document.getElementById('pdfMergeModal')) {
            this.createModal();
        }
    }

    createModal() {
        const modalHTML = `
            <div id="pdfMergeModal" class="pdf-modal" style="display: none;">
                <div class="pdf-modal-content">
                    <div class="pdf-modal-header">
                        <h3><i class="fas fa-file-pdf"></i> Advanced PDF Merger</h3>
                        <button class="pdf-modal-close">&times;</button>
                    </div>
                    <div class="pdf-modal-body">
                        <div class="pdf-upload-area" id="pdfUploadArea">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop PDF files here or click to select</p>
                            <input type="file" id="pdfFileInput" multiple accept=".pdf" style="display: none;">
                            <button class="pdf-select-btn" id="pdfSelectBtn">Select PDF Files</button>
                        </div>
                        
                        <div class="pdf-files-list" id="pdfFilesList" style="display: none;">
                            <h4>Files to Merge (<span id="fileCount">0</span>)</h4>
                            <div id="pdfFileItems"></div>
                        </div>
                        
                        <div class="pdf-merge-options" id="pdfMergeOptions" style="display: none;">
                            <label class="pdf-checkbox">
                                <input type="checkbox" id="pdfOptimize"> Optimize file size
                            </label>
                            <label class="pdf-checkbox">
                                <input type="checkbox" id="pdfRemoveMetadata"> Remove metadata
                            </label>
                        </div>
                        
                        <div class="pdf-progress" id="pdfProgress" style="display: none;">
                            <div class="pdf-progress-bar">
                                <div class="pdf-progress-fill" id="pdfProgressFill"></div>
                            </div>
                            <div class="pdf-progress-text" id="pdfProgressText">Preparing...</div>
                        </div>
                        
                        <div class="pdf-actions">
                            <button class="pdf-merge-btn" id="pdfMergeBtn" disabled>Merge PDFs</button>
                            <button class="pdf-clear-btn" id="pdfClearBtn">Clear All</button>
                        </div>
                        
                        <div class="pdf-result" id="pdfResult" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEvents();
    }

    attachEvents() {
        const modal = document.getElementById('pdfMergeModal');
        const closeBtn = modal.querySelector('.pdf-modal-close');
        const uploadArea = document.getElementById('pdfUploadArea');
        const fileInput = document.getElementById('pdfFileInput');
        const selectBtn = document.getElementById('pdfSelectBtn');
        const mergeBtn = document.getElementById('pdfMergeBtn');
        const clearBtn = document.getElementById('pdfClearBtn');
        
        let selectedFiles = [];
        
        // Close modal
        closeBtn.onclick = () => modal.style.display = 'none';
        
        // Click outside to close
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
        
        // Upload area click
        uploadArea.onclick = () => fileInput.click();
        
        // Select button click
        selectBtn.onclick = () => fileInput.click();
        
        // Drag and drop
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        };
        
        uploadArea.ondragleave = () => {
            uploadArea.classList.remove('drag-over');
        };
        
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
            this.addFiles(files);
        };
        
        // File selection
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.addFiles(files);
            fileInput.value = '';
        };
        
        // Merge button click
        mergeBtn.onclick = async () => {
            if (selectedFiles.length === 0) return;
            await this.performMerge(selectedFiles);
        };
        
        // Clear button
        clearBtn.onclick = () => {
            selectedFiles = [];
            this.updateFilesList(selectedFiles);
            mergeBtn.disabled = true;
            document.getElementById('pdfMergeOptions').style.display = 'none';
        };
    }
    
    addFiles(files) {
        const selectedFiles = this.getSelectedFiles();
        const newFiles = files.filter(f => !selectedFiles.some(sf => sf.name === f.name && sf.size === f.size));
        this.updateSelectedFiles([...selectedFiles, ...newFiles]);
    }
    
    getSelectedFiles() {
        return window._pdfSelectedFiles || [];
    }
    
    updateSelectedFiles(files) {
        window._pdfSelectedFiles = files;
        this.updateFilesList(files);
        const mergeBtn = document.getElementById('pdfMergeBtn');
        if (mergeBtn) {
            mergeBtn.disabled = files.length < 2;
        }
        
        const optionsDiv = document.getElementById('pdfMergeOptions');
        if (optionsDiv) {
            optionsDiv.style.display = files.length >= 2 ? 'block' : 'none';
        }
    }
    
    updateFilesList(files) {
        const filesListDiv = document.getElementById('pdfFilesList');
        const fileItemsDiv = document.getElementById('pdfFileItems');
        const fileCountSpan = document.getElementById('fileCount');
        
        if (files.length === 0) {
            filesListDiv.style.display = 'none';
            return;
        }
        
        filesListDiv.style.display = 'block';
        fileCountSpan.textContent = files.length;
        
        let html = '';
        files.forEach((file, index) => {
            const sizeKB = (file.size / 1024).toFixed(1);
            html += `
                <div class="pdf-file-item" data-index="${index}">
                    <i class="fas fa-file-pdf"></i>
                    <div class="pdf-file-info">
                        <div class="pdf-file-name">${this.escapeHtml(file.name)}</div>
                        <div class="pdf-file-size">${sizeKB} KB</div>
                    </div>
                    <button class="pdf-remove-file" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        fileItemsDiv.innerHTML = html;
        
        // Add remove file handlers
        fileItemsDiv.querySelectorAll('.pdf-remove-file').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                const newFiles = files.filter((_, i) => i !== index);
                this.updateSelectedFiles(newFiles);
            };
        });
    }
    
    async performMerge(files) {
        const mergeBtn = document.getElementById('pdfMergeBtn');
        const progressDiv = document.getElementById('pdfProgress');
        const progressFill = document.getElementById('pdfProgressFill');
        const progressText = document.getElementById('pdfProgressText');
        const resultDiv = document.getElementById('pdfResult');
        
        mergeBtn.disabled = true;
        mergeBtn.textContent = 'Merging...';
        progressDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        
        const merger = new PDFMergeTool();
        
        const result = await merger.mergePDFs(files, (progress) => {
            const percentage = (progress.currentFile / progress.totalFiles) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `Merging ${progress.currentFile}/${progress.totalFiles}: ${progress.fileName} (${progress.pagesAdded} pages)`;
        });
        
        if (result.success) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="pdf-success">
                    <i class="fas fa-check-circle"></i>
                    <h4>Merge Successful!</h4>
                    <p>${result.filesMerged} files merged into one PDF</p>
                    <p>Total pages: ${result.totalPages}</p>
                    <button class="pdf-new-merge" id="pdfNewMerge">Merge More Files</button>
                </div>
            `;
            
            document.getElementById('pdfNewMerge')?.addEventListener('click', () => {
                this.updateSelectedFiles([]);
                progressDiv.style.display = 'none';
                resultDiv.style.display = 'none';
                mergeBtn.disabled = true;
                mergeBtn.textContent = 'Merge PDFs';
            });
        } else {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="pdf-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Merge Failed</h4>
                    <p>${result.error}</p>
                </div>
            `;
            mergeBtn.disabled = false;
            mergeBtn.textContent = 'Merge PDFs';
        }
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    showModal() {
        const modal = document.getElementById('pdfMergeModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateSelectedFiles(window._pdfSelectedFiles || []);
        }
    }
}

// Initialize global PDF merge handler
window.pdfMergeUI = null;

function openPDFMerger() {
    if (!window.pdfMergeUI) {
        window.pdfMergeUI = new PDFMergeUI();
    }
    window.pdfMergeUI.showModal();
}
