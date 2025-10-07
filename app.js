// SELECTRA CHECKLIST AVEC HISTORIQUE - APPLICATION JAVASCRIPT COMPLÈTE
// Gestion des ventes, validation, historique et interface

class SelectraChecklistHistory {
    constructor() {
        // Configuration de base
        this.callStartTime = null;
        this.isCallActive = false;
        this.callTimer = null;
        this.currentTab = 'checklist';
        
        // État de l'application
        this.state = {
            clientFields: {},
            checkboxStates: {},
            servicesPayants: 0,
            counters: {
                client: 0,
                accords: 0,
                mentions: 0,
                sms: 0,
                etapes: 0
            }
        };
        
        // Historique des ventes (stocké localement)
        this.salesHistory = JSON.parse(localStorage.getItem('selectra-sales-history') || '[]');
        
        // Configuration des sections
        this.config = {
            client: { 
                total: 8, 
                required: ['client-nom', 'client-prenom', 'client-adresse', 'client-email', 'client-telephone'] 
            },
            accords: { 
                total: 6, 
                payants: ['accord-axa', 'accord-carbone', 'accord-mcp'],
                obligatoires: ['accord-rgpd', 'accord-reseau']
            },
            mentions: { 
                total: 5, 
                obligatoires: ['mention-frais', 'mention-retractation'] 
            },
            sms: { total: 3 },
            etapes: { total: 7 }
        };
        
        // Messages d'aide et validation
        this.messages = {
            validation: {
                clientIncomplete: "Informations client incomplètes (minimum: nom, prénom, adresse, email, téléphone)",
                accordsManquants: "Accords RGPD et Réseau obligatoires",
                servicesInsuffisants: "Minimum 2 services payants requis",
                mentionsManquantes: "Frais MES et Délai rétractation obligatoires"
            },
            success: {
                venteEnregistree: "Vente enregistrée avec succès !",
                checklistReset: "Checklist réinitialisée",
                historiqueVide: "Historique vidé",
                venteExportee: "Vente exportée",
                venteSupprimee: "Vente supprimée"
            },
            info: {
                etatRestaure: "État précédent restauré",
                appelDemarre: "Appel démarré !",
                appelTermine: "Appel terminé"
            }
        };
        
        this.init();
    }
    
    // === INITIALISATION ===
    init() {
        console.log('🚀 Initialisation Selectra Checklist avec Historique...');
        
        this.setupEventListeners();
        this.setupAutoSave();
        this.loadSavedState();
        this.updateAllCounters();
        this.updateHistoryDisplay();
        this.updateTabBadges();
        
        console.log('✅ Selectra Checklist avec Historique initialisée');
        console.log(`📊 Historique: ${this.salesHistory.length} vente(s)`);
    }
    
    // === GESTION DES ONGLETS ===
    switchTab(tabName) {
        // Mettre à jour l'interface des onglets
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activer le nouvel onglet
        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.getElementById(`tab-${tabName}-content`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Actions spécifiques par onglet
        if (tabName === 'history') {
            this.updateHistoryDisplay();
        }
        
        console.log(`📱 Onglet activé: ${tabName}`);
    }
    
    updateTabBadges() {
        // Badge checklist (progression globale)
        const totalPossible = Object.values(this.config).reduce((sum, config) => sum + config.total, 0);
        const currentTotal = Object.values(this.state.counters).reduce((sum, count) => sum + count, 0);
        const percentage = totalPossible > 0 ? Math.round((currentTotal / totalPossible) * 100) : 0;
        
        const checklistBadge = document.getElementById('checklist-badge');
        checklistBadge.textContent = percentage + '%';
        checklistBadge.className = percentage >= 80 ? 'tab-badge success' : 'tab-badge';
        
        // Badge historique (nombre de ventes)
        const historyBadge = document.getElementById('history-badge');
        historyBadge.textContent = this.salesHistory.length;
        historyBadge.className = 'tab-badge success';
    }
    
    // === GESTION DES ÉVÉNEMENTS ===
    setupEventListeners() {
        console.log('🎯 Configuration des événements...');
        
        // Champs client
        const clientFields = document.querySelectorAll('[data-section="client"]');
        clientFields.forEach(field => {
            field.addEventListener('input', (e) => {
                this.handleFieldInput(e);
            });
            
            field.addEventListener('blur', (e) => {
                this.validateField(e.target);
            });
        });
        
        // Checkboxes
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(e);
            });
        });
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                if (this.currentTab === 'checklist') {
                    this.openValidationModal();
                }
            }
            if (e.key === 'F1') {
                e.preventDefault();
                this.switchTab(this.currentTab === 'checklist' ? 'history' : 'checklist');
            }
        });
    }
    
    handleFieldInput(event) {
        const field = event.target;
        const fieldId = field.id;
        const value = field.value.trim();
        
        // Sauvegarde de la valeur
        this.state.clientFields[fieldId] = value;
        
        // Validation temps réel
        this.validateField(field);
        
        // Mise à jour des compteurs
        this.updateClientCounter();
        this.updateValidateButton();
        this.updateTabBadges();
        
        // Sauvegarde automatique
        this.debouncedSave();
    }
    
    validateField(field) {
        const value = field.value.trim();
        const fieldId = field.id;
        const isRequired = this.config.client.required.includes(fieldId);
        
        let isValid = true;
        
        // Validations spécifiques
        if (fieldId === 'client-email' && value) {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        } else if (fieldId === 'client-telephone' && value) {
            isValid = /^(?:(?:\+33|0)[1-9](?:[0-9]{8}))$/.test(value.replace(/\s/g, ''));
        } else if ((fieldId === 'client-pdl' || fieldId === 'client-pce') && value) {
            isValid = /^\d{14}$/.test(value);
        } else if (fieldId === 'client-iban' && value) {
            isValid = /^FR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}$/.test(value);
        }
        
        // Application des styles visuels
        field.classList.remove('valid', 'invalid');
        
        if (value) {
            field.classList.add(isValid ? 'valid' : 'invalid');
        } else if (isRequired) {
            field.classList.add('invalid');
        }
        
        return isValid && (value || !isRequired);
    }
    
    handleCheckboxChange(event) {
        const checkbox = event.target;
        const checkboxId = checkbox.id;
        const section = checkbox.dataset.section;
        const isChecked = checkbox.checked;
        
        // Sauvegarde de l'état
        this.state.checkboxStates[checkboxId] = isChecked;
        
        // Gestion spéciale pour les services payants
        if (checkbox.dataset.payant === 'true') {
            this.updateServicesPayantsCount();
        }
        
        // Mise à jour des compteurs
        this.updateSectionCounter(section);
        this.updateValidateButton();
        this.updateTabBadges();
        
        // Animation visuelle
        this.animateCheckbox(checkbox);
        
        // Sauvegarde automatique
        this.debouncedSave();
        
        console.log(`✅ ${checkboxId}: ${isChecked}`);
    }
    
    animateCheckbox(checkbox) {
        const checkmark = checkbox.nextElementSibling;
        if (checkmark && checkbox.checked) {
            checkmark.style.transform = 'scale(1.2)';
            setTimeout(() => {
                checkmark.style.transform = 'scale(1.05)';
            }, 150);
        }
    }
    
    // === GESTION DES COMPTEURS ===
    updateClientCounter() {
        let count = 0;
        const clientFields = document.querySelectorAll('[data-section="client"]');
        
        clientFields.forEach(field => {
            if (field.value.trim() && !field.classList.contains('invalid')) {
                count++;
            }
        });
        
        this.state.counters.client = count;
        this.updateCounterDisplay('client', count, this.config.client.total);
    }
    
    updateSectionCounter(section) {
        const checkboxes = document.querySelectorAll(`input[data-section="${section}"]:checked`);
        const count = checkboxes.length;
        
        this.state.counters[section] = count;
        
        if (this.config[section]) {
            this.updateCounterDisplay(section, count, this.config[section].total);
        }
    }
    
    updateCounterDisplay(section, current, total) {
        const counterElement = document.getElementById(`${section}-counter`);
        if (!counterElement) return;
        
        counterElement.textContent = `${current}/${total}`;
        
        // Couleurs progressives selon le pourcentage
        const percentage = (current / total) * 100;
        
        if (percentage === 100) {
            counterElement.style.background = '#D1FAE5';
            counterElement.style.color = '#065F46';
        } else if (percentage >= 50) {
            counterElement.style.background = '#FEF3C7';
            counterElement.style.color = '#92400E';
        } else {
            counterElement.style.background = '#F1F5F9';
            counterElement.style.color = '#64748B';
        }
    }
    
    updateServicesPayantsCount() {
        const servicesPayants = document.querySelectorAll('input[data-payant="true"]:checked');
        this.state.servicesPayants = servicesPayants.length;
        
        const countElement = document.getElementById('services-count');
        if (countElement) {
            countElement.textContent = this.state.servicesPayants;
        }
    }
    
    updateAllCounters() {
        this.updateClientCounter();
        ['accords', 'mentions', 'sms', 'etapes'].forEach(section => {
            this.updateSectionCounter(section);
        });
        this.updateServicesPayantsCount();
        this.updateValidateButton();
    }
    
    // === VALIDATION ET MODAL ===
    updateValidateButton() {
        const validateBtn = document.getElementById('validate-btn');
        if (!validateBtn) return;
        
        const validation = this.checkValidationCriteria();
        validateBtn.disabled = !validation.isValid;
        
        // Mise à jour du texte selon l'état
        if (validation.isValid) {
            validateBtn.textContent = '✅ Valider Vente';
        } else {
            validateBtn.textContent = `⚠️ ${validation.missingCount} critère(s) manquant(s)`;
        }
    }
    
    checkValidationCriteria() {
        let missingCount = 0;
        const issues = [];
        
        // Vérification des champs client obligatoires
        const hasRequiredFields = this.config.client.required.every(fieldId => {
            const field = document.getElementById(fieldId);
            const isValid = field && field.value.trim() && !field.classList.contains('invalid');
            if (!isValid) missingCount++;
            return isValid;
        });
        
        if (!hasRequiredFields) {
            issues.push(this.messages.validation.clientIncomplete);
        }
        
        // Vérification des accords obligatoires
        const hasRequiredAccords = this.config.accords.obligatoires.every(accordId => {
            const checkbox = document.getElementById(accordId);
            const isChecked = checkbox?.checked || false;
            if (!isChecked) missingCount++;
            return isChecked;
        });
        
        if (!hasRequiredAccords) {
            issues.push(this.messages.validation.accordsManquants);
        }
        
        // Vérification des services payants
        const hasMinServices = this.state.servicesPayants >= 2;
        if (!hasMinServices) {
            missingCount++;
            issues.push(this.messages.validation.servicesInsuffisants);
        }
        
        // Vérification des mentions obligatoires
        const hasRequiredMentions = this.config.mentions.obligatoires.every(mentionId => {
            const checkbox = document.getElementById(mentionId);
            const isChecked = checkbox?.checked || false;
            if (!isChecked) missingCount++;
            return isChecked;
        });
        
        if (!hasRequiredMentions) {
            issues.push(this.messages.validation.mentionsManquantes);
        }
        
        const isValid = hasRequiredFields && hasRequiredAccords && hasMinServices && hasRequiredMentions;
        
        return {
            isValid,
            missingCount,
            issues,
            hasRequiredFields,
            hasRequiredAccords,
            hasMinServices,
            hasRequiredMentions
        };
    }
    
    openValidationModal() {
        const validation = this.checkValidationCriteria();
        
        if (!validation.isValid) {
            this.showNotification(`Validation impossible: ${validation.missingCount} critère(s) manquant(s)`, 'error');
            return;
        }
        
        const modal = document.getElementById('validation-modal');
        this.populateValidationModal();
        modal.classList.add('show');
        
        console.log('📋 Modal de validation ouverte');
    }
    
    closeValidationModal() {
        document.getElementById('validation-modal').classList.remove('show');
        console.log('📋 Modal de validation fermée');
    }
    
    populateValidationModal() {
        // Section informations client
        this.populateClientValidation();
        // Section accords et services
        this.populateAccordsValidation();
        // Section conformité
        this.populateConformiteValidation();
        
        // État du bouton de sauvegarde
        const validation = this.checkValidationCriteria();
        const saveBtn = document.getElementById('validation-save-btn');
        saveBtn.disabled = !validation.isValid;
    }
    
    populateClientValidation() {
        const clientSection = document.getElementById('validation-client');
        let clientHTML = '';
        
        this.config.client.required.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const label = this.getFieldLabel(fieldId);
            const value = field?.value.trim() || '';
            const isValid = value && !field?.classList.contains('invalid');
            
            clientHTML += `
                <div class="validation-item ${isValid ? 'success' : 'error'}">
                    <span>${label}:</span>
                    <span class="validation-status">${isValid ? '✓' : '✗'}</span>
                </div>
            `;
        });
        
        clientSection.innerHTML = clientHTML;
    }
    
    populateAccordsValidation() {
        const accordsSection = document.getElementById('validation-accords');
        let accordsHTML = '';
        
        const accords = [
            { id: 'accord-rgpd', label: 'RGPD', required: true },
            { id: 'accord-reseau', label: 'Réseau', required: true },
            { id: 'accord-voltalis', label: 'Voltalis', required: false },
            { id: 'accord-axa', label: 'AXA Assistance', payant: true },
            { id: 'accord-carbone', label: 'Compensation Carbone', payant: true },
            { id: 'accord-mcp', label: 'Mon Conseiller Perso', payant: true }
        ];
        
        accords.forEach(accord => {
            const checkbox = document.getElementById(accord.id);
            const isChecked = checkbox?.checked || false;
            const cssClass = isChecked ? 'success' : (accord.required ? 'error' : '');
            
            let badges = '';
            if (accord.payant) badges += ' (Payant)';
            if (accord.required) badges += ' (Obligatoire)';
            
            accordsHTML += `
                <div class="validation-item ${cssClass}">
                    <span>${accord.label}${badges}:</span>
                    <span class="validation-status">${isChecked ? '✓' : '✗'}</span>
                </div>
            `;
        });
        
        accordsSection.innerHTML = accordsHTML;
    }
    
    populateConformiteValidation() {
        const conformiteSection = document.getElementById('validation-conformite');
        let conformiteHTML = '';
        
        const servicesOk = this.state.servicesPayants >= 2;
        const mentionsFrais = document.getElementById('mention-frais')?.checked || false;
        const mentionsRetractation = document.getElementById('mention-retractation')?.checked || false;
        
        const conformiteChecks = [
            {
                label: 'Services payants (min 2)',
                isValid: servicesOk,
                detail: `(${this.state.servicesPayants}/3)`
            },
            {
                label: 'Frais MES communiqués',
                isValid: mentionsFrais,
                detail: ''
            },
            {
                label: 'Délai rétractation',
                isValid: mentionsRetractation,
                detail: ''
            }
        ];
        
        conformiteChecks.forEach(check => {
            conformiteHTML += `
                <div class="validation-item ${check.isValid ? 'success' : 'error'}">
                    <span>${check.label}:</span>
                    <span class="validation-status">${check.isValid ? '✓' : '✗'} ${check.detail}</span>
                </div>
            `;
        });
        
        conformiteSection.innerHTML = conformiteHTML;
    }
    
    getFieldLabel(fieldId) {
        const labels = {
            'client-nom': 'Nom',
            'client-prenom': 'Prénom',
            'client-adresse': 'Adresse',
            'client-email': 'Email',
            'client-telephone': 'Téléphone',
            'client-pdl': 'PDL',
            'client-pce': 'PCE',
            'client-iban': 'IBAN'
        };
        return labels[fieldId] || fieldId.replace('client-', '');
    }
    
    // === GESTION DE L'HISTORIQUE ===
    saveToHistory() {
        const callDuration = this.callStartTime ? 
            Math.floor((Date.now() - this.callStartTime) / 1000) : 0;
        
        // Construction de l'objet vente
        const saleData = {
            id: Date.now(),
            date: new Date().toISOString(),
            client: {
                nom: document.getElementById('client-nom')?.value || '',
                prenom: document.getElementById('client-prenom')?.value || '',
                adresse: document.getElementById('client-adresse')?.value || '',
                email: document.getElementById('client-email')?.value || '',
                telephone: document.getElementById('client-telephone')?.value || ''
            },
            services: {
                axa: document.getElementById('accord-axa')?.checked || false,
                carbone: document.getElementById('accord-carbone')?.checked || false,
                mcp: document.getElementById('accord-mcp')?.checked || false,
                voltalis: document.getElementById('accord-voltalis')?.checked || false
            },
            duration: callDuration,
            servicesCount: this.state.servicesPayants,
            isComplete: true,
            commercialNotes: this.getCommercialNotes()
        };
        
        // Ajout en tête de liste
        this.salesHistory.unshift(saleData);
        
        // Limite à 100 ventes pour éviter la surcharge
        if (this.salesHistory.length > 100) {
            this.salesHistory = this.salesHistory.slice(0, 100);
        }
        
        this.saveSalesHistory();
        
        // Fermeture de la modal et notifications
        this.closeValidationModal();
        this.showNotification(this.messages.success.venteEnregistree, 'success');
        
        // Reset automatique de la checklist
        this.resetChecklist(false);
        
        // Mise à jour de l'affichage
        this.updateHistoryDisplay();
        this.updateTabBadges();
        
        // Basculement vers l'historique
        this.switchTab('history');
        
        console.log(`💾 Vente enregistrée: ${saleData.client.prenom} ${saleData.client.nom}`);
    }
    
    getCommercialNotes() {
        // Récupération des notes commerciales si présentes
        return {
            observations: 'Vente validée avec succès',
            servicesProposed: this.getProposedServices(),
            callQuality: this.assessCallQuality()
        };
    }
    
    getProposedServices() {
        const proposed = [];
        if (document.getElementById('accord-axa')?.checked) proposed.push('AXA Assistance');
        if (document.getElementById('accord-carbone')?.checked) proposed.push('Compensation Carbone');
        if (document.getElementById('accord-mcp')?.checked) proposed.push('Mon Conseiller Perso');
        if (document.getElementById('accord-voltalis')?.checked) proposed.push('Voltalis');
        return proposed;
    }
    
    assessCallQuality() {
        const totalPossible = Object.values(this.config).reduce((sum, config) => sum + config.total, 0);
        const currentTotal = Object.values(this.state.counters).reduce((sum, count) => sum + count, 0);
        const completeness = Math.round((currentTotal / totalPossible) * 100);
        
        if (completeness >= 90) return 'Excellent';
        if (completeness >= 75) return 'Bon';
        if (completeness >= 60) return 'Satisfaisant';
        return 'À améliorer';
    }
    
    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        const totalSales = document.getElementById('total-sales');
        const totalServices = document.getElementById('total-services');
        
        if (!historyList) return;
        
        // Statistiques globales
        totalSales.textContent = this.salesHistory.length;
        const servicesTotal = this.salesHistory.reduce((sum, sale) => sum + sale.servicesCount, 0);
        totalServices.textContent = servicesTotal;
        
        if (this.salesHistory.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <div class="history-empty-icon">📋</div>
                    <p>Aucune vente enregistrée</p>
                    <small>Les ventes validées apparaîtront ici</small>
                </div>
            `;
            return;
        }
        
        // Génération de la liste
        let historyHTML = '';
        
        this.salesHistory.forEach((sale, index) => {
            const date = new Date(sale.date);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            const duration = this.formatDuration(sale.duration);
            const services = this.formatServices(sale.services);
            
            historyHTML += `
                <div class="history-item" onclick="showSaleDetails(${index})">
                    <div class="history-item-header">
                        <div class="history-client">${sale.client.prenom} ${sale.client.nom}</div>
                        <div class="history-date">${dateStr} ${timeStr}</div>
                    </div>
                    <div class="history-details">
                        <span class="history-badge history-badge-services">${sale.servicesCount} service${sale.servicesCount > 1 ? 's' : ''}</span>
                        <span class="history-badge history-badge-duration">${duration}</span>
                        <span class="history-badge history-badge-complete">Validé</span>
                    </div>
                    <div class="history-services">
                        Services: ${services.length > 0 ? services.join(', ') : 'Aucun service payant'}
                    </div>
                    <div class="history-actions" onclick="event.stopPropagation()">
                        <button class="history-btn" onclick="exportSale(${index})">📄 Exporter</button>
                        <button class="history-btn" onclick="duplicateSale(${index})" style="color: #0052CC;">📋 Dupliquer</button>
                        <button class="history-btn" onclick="deleteSale(${index})" style="color: #EF4444;">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    formatServices(services) {
        const activeServices = [];
        if (services.axa) activeServices.push('AXA');
        if (services.carbone) activeServices.push('Carbone');
        if (services.mcp) activeServices.push('MCP');
        if (services.voltalis) activeServices.push('Voltalis');
        return activeServices;
    }
    
    clearHistory() {
        if (confirm('Voulez-vous vraiment vider tout l\'historique des ventes ?\n\n⚠️ Cette action est irréversible.')) {
            this.salesHistory = [];
            this.saveSalesHistory();
            this.updateHistoryDisplay();
            this.updateTabBadges();
            this.showNotification(this.messages.success.historiqueVide, 'warning');
            
            console.log('🗑️ Historique vidé');
        }
    }
    
    saveSalesHistory() {
        localStorage.setItem('selectra-sales-history', JSON.stringify(this.salesHistory));
    }
    
    // === TIMER D'APPEL ===
    startCall() {
        if (this.isCallActive) {
            this.stopCall();
            return;
        }
        
        this.callStartTime = Date.now();
        this.isCallActive = true;
        
        const startBtn = document.getElementById('start-call');
        startBtn.textContent = '🛑 Arrêter';
        startBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        
        this.callTimer = setInterval(() => {
            this.updateCallTimer();
        }, 1000);
        
        this.showNotification(this.messages.info.appelDemarre, 'info');
        console.log('📞 Appel démarré');
    }
    
    stopCall() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
        }
        
        const callDuration = this.callStartTime ? 
            Math.floor((Date.now() - this.callStartTime) / 1000) : 0;
        
        this.isCallActive = false;
        
        const startBtn = document.getElementById('start-call');
        startBtn.textContent = '📞 Démarrer';
        startBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        
        this.showNotification(`${this.messages.info.appelTermine} (${this.formatDuration(callDuration)})`, 'info');
        console.log(`📞 Appel terminé - Durée: ${this.formatDuration(callDuration)}`);
    }
    
    updateCallTimer() {
        if (!this.callStartTime) return;
        
        const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('call-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // === ACTIONS GÉNÉRALES ===
    resetChecklist(showConfirm = true) {
        if (showConfirm && !confirm('Voulez-vous vraiment réinitialiser la checklist ?\n\n⚠️ Toutes les données non sauvegardées seront perdues.')) {
            return;
        }
        
        // Arrêt de l'appel si actif
        if (this.isCallActive) {
            this.stopCall();
        }
        
        // Reset des champs
        document.querySelectorAll('[data-section="client"]').forEach(field => {
            field.value = '';
            field.classList.remove('valid', 'invalid');
        });
        
        // Reset des checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Reset de l'état
        this.state = {
            clientFields: {},
            checkboxStates: {},
            servicesPayants: 0,
            counters: {
                client: 0,
                accords: 0,
                mentions: 0,
                sms: 0,
                etapes: 0
            }
        };
        
        // Reset du timer
        this.callStartTime = null;
        document.getElementById('call-timer').textContent = '00:00';
        
        // Mise à jour de l'affichage
        this.updateAllCounters();
        this.updateTabBadges();
        this.clearState();
        
        if (showConfirm) {
            this.showNotification(this.messages.success.checklistReset, 'info');
        }
        
        console.log('🔄 Checklist réinitialisée');
    }
    
    // === SAUVEGARDE AUTOMATIQUE ===
    setupAutoSave() {
        // Sauvegarde automatique toutes les 30 secondes
        setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.saveState();
            }
        }, 30000);
        
        // Sauvegarde avant fermeture de la page
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
        
        console.log('💾 Auto-sauvegarde configurée');
    }
    
    debouncedSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveState();
        }, 2000); // 2 secondes après la dernière modification
    }
    
    hasUnsavedChanges() {
        return Object.keys(this.state.clientFields).length > 0 || 
               Object.keys(this.state.checkboxStates).length > 0;
    }
    
    saveState() {
        const stateToSave = {
            ...this.state,
            callStartTime: this.callStartTime,
            isCallActive: this.isCallActive,
            currentTab: this.currentTab,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        localStorage.setItem('selectra-checklist-history-state', JSON.stringify(stateToSave));
    }
    
    loadSavedState() {
        const saved = localStorage.getItem('selectra-checklist-history-state');
        if (!saved) return;
        
        try {
            const state = JSON.parse(saved);
            
            // Vérifier la validité (moins de 24h)
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                console.log('💾 État sauvegardé trop ancien, ignoré');
                return;
            }
            
            // Restaurer l'état
            this.state = { ...this.state, ...state };
            this.callStartTime = state.callStartTime;
            this.isCallActive = state.isCallActive;
            this.currentTab = state.currentTab || 'checklist';
            
            this.restoreFields();
            this.restoreCheckboxes();
            this.restoreTimer();
            this.restoreTab();
            
            this.updateAllCounters();
            this.updateTabBadges();
            
            this.showNotification(this.messages.info.etatRestaure, 'info');
            console.log('💾 État précédent restauré');
            
        } catch (e) {
            console.error('❌ Erreur lors de la restauration:', e);
            this.clearState();
        }
    }
    
    restoreFields() {
        Object.keys(this.state.clientFields).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && this.state.clientFields[fieldId]) {
                field.value = this.state.clientFields[fieldId];
                this.validateField(field);
            }
        });
    }
    
    restoreCheckboxes() {
        Object.keys(this.state.checkboxStates).forEach(checkboxId => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.checked = this.state.checkboxStates[checkboxId];
            }
        });
    }
    
    restoreTimer() {
        if (this.isCallActive && this.callStartTime) {
            const startBtn = document.getElementById('start-call');
            startBtn.textContent = '🛑 Arrêter';
            startBtn.style.background = 'rgba(239, 68, 68, 0.2)';
            
            this.callTimer = setInterval(() => {
                this.updateCallTimer();
            }, 1000);
        }
    }
    
    restoreTab() {
        if (this.currentTab !== 'checklist') {
            this.switchTab(this.currentTab);
        }
    }
    
    clearState() {
        localStorage.removeItem('selectra-checklist-history-state');
    }
    
    // === NOTIFICATIONS ===
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
        
        console.log(`📣 ${type.toUpperCase()}: ${message}`);
    }
    
    // === UTILITAIRES ===
    exportAllHistory() {
        if (this.salesHistory.length === 0) {
            this.showNotification('Aucune vente à exporter', 'warning');
            return;
        }
        
        const csvContent = this.generateHistoryCSV();
        this.downloadFile(csvContent, `historique_selectra_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        this.showNotification('Historique exporté', 'success');
    }
    
    generateHistoryCSV() {
        const headers = ['Date', 'Client', 'Email', 'Téléphone', 'Services', 'Nombre Services', 'Durée', 'AXA', 'Carbone', 'MCP', 'Voltalis'];
        const rows = [headers.join(';')];
        
        this.salesHistory.forEach(sale => {
            const row = [
                new Date(sale.date).toLocaleDateString('fr-FR'),
                `${sale.client.prenom} ${sale.client.nom}`,
                sale.client.email,
                sale.client.telephone,
                this.formatServices(sale.services).join(' + '),
                sale.servicesCount,
                this.formatDuration(sale.duration),
                sale.services.axa ? 'Oui' : 'Non',
                sale.services.carbone ? 'Oui' : 'Non',
                sale.services.mcp ? 'Oui' : 'Non',
                sale.services.voltalis ? 'Oui' : 'Non'
            ];
            rows.push(row.join(';'));
        });
        
        return rows.join('\n');
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // === MÉTHODES DEBUG ===
    getDebugInfo() {
        return {
            version: '1.0',
            salesCount: this.salesHistory.length,
            currentState: this.state,
            isCallActive: this.isCallActive,
            callDuration: this.callStartTime ? Math.floor((Date.now() - this.callStartTime) / 1000) : 0,
            validation: this.checkValidationCriteria()
        };
    }
    
    resetAllData() {
        if (confirm('⚠️ ATTENTION ⚠️\n\nCette action va supprimer TOUTES les données :\n- Historique des ventes\n- État de la checklist actuelle\n- Paramètres sauvegardés\n\nÊtes-vous absolument certain ?')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// === FONCTIONS GLOBALES POUR L'INTERFACE ===

// Gestion des onglets
window.switchTab = (tabName) => {
    if (window.app) {
        window.app.switchTab(tabName);
    }
};

// Actions de la checklist
window.startCall = () => {
    if (window.app) {
        window.app.startCall();
    }
};

window.openValidationModal = () => {
    if (window.app) {
        window.app.openValidationModal();
    }
};

window.closeValidationModal = () => {
    if (window.app) {
        window.app.closeValidationModal();
    }
};

window.saveToHistory = () => {
    if (window.app) {
        window.app.saveToHistory();
    }
};

window.resetChecklist = () => {
    if (window.app) {
        window.app.resetChecklist();
    }
};

// Actions de l'historique
window.clearHistory = () => {
    if (window.app) {
        window.app.clearHistory();
    }
};

window.showSaleDetails = (index) => {
    if (!window.app || !window.app.salesHistory[index]) return;
    
    const sale = window.app.salesHistory[index];
    const services = window.app.formatServices(sale.services);
    const duration = window.app.formatDuration(sale.duration);
    
    const details = `
📋 DÉTAILS DE LA VENTE

👤 Client: ${sale.client.prenom} ${sale.client.nom}
📧 Email: ${sale.client.email}
📞 Téléphone: ${sale.client.telephone}
🏠 Adresse: ${sale.client.adresse}

⭐ Services souscrits: ${sale.servicesCount}
${services.length > 0 ? '📦 ' + services.join(', ') : '❌ Aucun service payant'}

⏱️ Durée d'appel: ${duration}
📅 Date: ${new Date(sale.date).toLocaleString('fr-FR')}
    `.trim();
    
    alert(details);
};

window.exportSale = (index) => {
    if (!window.app || !window.app.salesHistory[index]) return;
    
    const sale = window.app.salesHistory[index];
    const services = window.app.formatServices(sale.services);
    const duration = window.app.formatDuration(sale.duration);
    
    const exportData = `
FICHE VENTE SELECTRA
====================

Date de la vente: ${new Date(sale.date).toLocaleDateString('fr-FR')}
Heure: ${new Date(sale.date).toLocaleTimeString('fr-FR')}
Durée d'appel: ${duration}

INFORMATIONS CLIENT
-------------------
Nom: ${sale.client.nom}
Prénom: ${sale.client.prenom}
Adresse: ${sale.client.adresse}
Email: ${sale.client.email}
Téléphone: ${sale.client.telephone}

SERVICES SOUSCRITS
------------------
Nombre total: ${sale.servicesCount}

AXA Assistance: ${sale.services.axa ? 'OUI (6,99€/mois)' : 'Non'}
Compensation Carbone: ${sale.services.carbone ? 'OUI (variable)' : 'Non'}
Mon Conseiller Perso: ${sale.services.mcp ? 'OUI (6€ ou 14€/mois)' : 'Non'}
Voltalis: ${sale.services.voltalis ? 'OUI (Gratuit)' : 'Non'}

RÉCAPITULATIF
-------------
Services payants: ${services.filter(s => s !== 'Voltalis').length}
Objectif atteint: ${sale.servicesCount >= 2 ? 'OUI ✓' : 'NON ✗'}
Qualité appel: ${sale.commercialNotes?.callQuality || 'Non évaluée'}

---
Généré par Selectra Checklist v1.0
    `.trim();
    
    const filename = `vente_${sale.client.nom.toLowerCase()}_${new Date(sale.date).toISOString().split('T')[0]}.txt`;
    window.app.downloadFile(exportData, filename, 'text/plain;charset=utf-8');
    window.app.showNotification(window.app.messages.success.venteExportee, 'success');
};

window.duplicateSale = (index) => {
    if (!window.app || !window.app.salesHistory[index]) return;
    
    const sale = window.app.salesHistory[index];
    
    if (confirm(`Dupliquer la vente de ${sale.client.prenom} ${sale.client.nom} ?\n\nCela va remplir la checklist avec les informations de cette vente.`)) {
        // Remplir les champs client
        document.getElementById('client-nom').value = sale.client.nom;
        document.getElementById('client-prenom').value = sale.client.prenom;
        document.getElementById('client-adresse').value = sale.client.adresse;
        document.getElementById('client-email').value = sale.client.email;
        document.getElementById('client-telephone').value = sale.client.telephone;
        
        // Remplir les services
        document.getElementById('accord-axa').checked = sale.services.axa;
        document.getElementById('accord-carbone').checked = sale.services.carbone;
        document.getElementById('accord-mcp').checked = sale.services.mcp;
        document.getElementById('accord-voltalis').checked = sale.services.voltalis;
        
        // Mise à jour de l'état
        window.app.state.clientFields = {
            'client-nom': sale.client.nom,
            'client-prenom': sale.client.prenom,
            'client-adresse': sale.client.adresse,
            'client-email': sale.client.email,
            'client-telephone': sale.client.telephone
        };
        
        // Recalcul des compteurs
        window.app.updateAllCounters();
        window.app.updateTabBadges();
        
        // Basculer vers la checklist
        window.app.switchTab('checklist');
        
        window.app.showNotification('Vente dupliquée dans la checklist', 'success');
    }
};

window.deleteSale = (index) => {
    if (!window.app || !window.app.salesHistory[index]) return;
    
    const sale = window.app.salesHistory[index];
    
    if (confirm(`Supprimer définitivement la vente de ${sale.client.prenom} ${sale.client.nom} ?\n\n⚠️ Cette action est irréversible.`)) {
        window.app.salesHistory.splice(index, 1);
        window.app.saveSalesHistory();
        window.app.updateHistoryDisplay();
        window.app.updateTabBadges();
        window.app.showNotification(window.app.messages.success.venteSupprimee, 'warning');
    }
};

// === RACCOURCIS CLAVIER GLOBAUX ===
document.addEventListener('keydown', (e) => {
    // Ctrl+H : Historique
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        window.switchTab('history');
    }
    
    // Ctrl+L : Checklist
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        window.switchTab('checklist');
    }
    
    // Ctrl+R : Reset (avec confirmation)
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (window.app) {
            window.app.resetChecklist();
        }
    }
    
    // Ctrl+E : Export historique
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (window.app) {
            window.app.exportAllHistory();
        }
    }
    
    // Escape : Fermer modal
    if (e.key === 'Escape') {
        window.closeValidationModal();
    }
});

// === INITIALISATION DE L'APPLICATION ===
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Démarrage de l\'application Selectra Checklist...');
    
    try {
        window.app = new SelectraChecklistHistory();
        
        // Debug global (développement uniquement)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.debug = {
                app: window.app,
                info: () => window.app.getDebugInfo(),
                reset: () => window.app.resetAllData(),
                export: () => window.app.exportAllHistory()
            };
            console.log('🔧 Mode debug activé - Utilisez window.debug');
        }
        
        console.log('✅ Application Selectra Checklist opérationnelle');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        alert('Erreur lors du chargement de l\'application. Veuillez actualiser la page.');
    }
});

// === GESTION DES ERREURS GLOBALES ===
window.addEventListener('error', (event) => {
    console.error('❌ Erreur JavaScript:', event.error);
    
    if (window.app) {
        window.app.showNotification('Une erreur est survenue', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesse rejetée:', event.reason);
    
    if (window.app) {
        window.app.showNotification('Erreur de traitement', 'error');
    }
});