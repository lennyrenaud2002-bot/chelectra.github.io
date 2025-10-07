// === AJOUT JAVASCRIPT POUR MENUS DEROULANTS ===
// Code à ajouter dans la classe SelectraChecklistHistory existante

// === AJOUT DANS LE CONSTRUCTEUR (state) ===
// Ajouter cette propriété dans this.state :
/*
this.state = {
    // ... propriétés existantes ...
    serviceStatuts: {
        axa: 'non',
        offset: 'non'
    },
    offsetPalier: '2.99'
};
*/

// === NOUVELLES MÉTHODES À AJOUTER ===

// Gestion des menus déroulants de services
handleServiceStatusChange(service, status) {
    this.state.serviceStatuts[service] = status;
    
    // Mise à jour visuelle du select
    const select = document.getElementById(`${service}-statut`);
    if (select) {
        select.className = `service-select status-${status}`;
    }
    
    // Mise à jour du badge dans la section accords
    this.updateServiceStatusBadge(service, status);
    
    // Affichage/masquage du sélecteur de palier pour Offset
    if (service === 'offset') {
        this.toggleOffsetPalierGroup(status);
    }
    
    // Mise à jour du compteur des services payants
    this.updateServicesPayantsCountWithStatus();
    
    // Sauvegarde
    this.debouncedSave();
    
    console.log(`📊 ${service} statut: ${status}`);
}

// Mise à jour du badge de statut dans la section Accords
updateServiceStatusBadge(service, status) {
    const serviceLabels = {
        'axa': 'accord-axa',
        'offset': 'accord-carbone'
    };
    
    const checkboxItem = document.querySelector(`#${serviceLabels[service]}`).closest('.checkbox-item');
    
    // Supprime l'ancien badge s'il existe
    const oldBadge = checkboxItem.querySelector('.service-status-badge');
    if (oldBadge) {
        oldBadge.remove();
    }
    
    // Ajoute le nouveau badge
    const statusText = {
        'non': '❌ Non proposé',
        'propose': '💬 Proposé',
        'vendu': '✅ Vendu'
    };
    
    const badge = document.createElement('span');
    badge.className = `service-status-badge ${status}`;
    badge.textContent = statusText[status];
    
    const itemLabel = checkboxItem.querySelector('.item-label');
    itemLabel.appendChild(badge);
}

// Gestion du sélecteur de palier Offset
handleOffsetPalierChange(palier) {
    this.state.offsetPalier = palier;
    
    // Mise à jour de l'affichage d'info du palier
    const palierInfo = document.querySelector('.palier-info');
    if (palierInfo) {
        const palierData = {
            '2.99': '2,24t CO₂/mois',
            '3.99': '2,98t CO₂/mois',
            '4.99': '3,59t CO₂/mois',
            '5.99': '4,49t CO₂/mois',
            '7.50': '5,40t CO₂/mois',
            '14.99': '11,34t CO₂/mois'
        };
        
        palierInfo.textContent = `${palier}€/mois - ${palierData[palier]}`;
    }
    
    this.debouncedSave();
    console.log(`🌱 Offset palier: ${palier}€`);
}

// Affichage/masquage du groupe palier Offset
toggleOffsetPalierGroup(status) {
    const palierGroup = document.querySelector('.offset-palier-group');
    if (palierGroup) {
        if (status === 'propose' || status === 'vendu') {
            palierGroup.classList.add('show');
        } else {
            palierGroup.classList.remove('show');
        }
    }
}

// Mise à jour du compteur de services avec les statuts
updateServicesPayantsCountWithStatus() {
    let count = 0;
    
    // Compte seulement les services "vendu"
    Object.entries(this.state.serviceStatuts).forEach(([service, status]) => {
        if (status === 'vendu') {
            count++;
        }
    });
    
    // Ajoute MCP s'il est coché (pas de dropdown pour MCP)
    const mcpCheckbox = document.getElementById('accord-mcp');
    if (mcpCheckbox && mcpCheckbox.checked) {
        count++;
    }
    
    this.state.servicesPayants = count;
    
    const countElement = document.getElementById('services-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

// === AJOUT DANS setupEventListeners() ===
// Ajouter ces event listeners :
/*
// Menus déroulants services
const serviceSelects = document.querySelectorAll('.service-select');
serviceSelects.forEach(select => {
    select.addEventListener('change', (e) => {
        const [service, type] = e.target.id.split('-');
        if (type === 'statut') {
            this.handleServiceStatusChange(service, e.target.value);
        } else if (type === 'palier') {
            this.handleOffsetPalierChange(e.target.value);
        }
    });
});
*/

// === AJOUT DANS saveToHistory() ===
// Modifier la section services pour inclure les statuts :
/*
services: {
    axa: {
        proposed: this.state.serviceStatuts.axa === 'propose' || this.state.serviceStatuts.axa === 'vendu',
        sold: this.state.serviceStatuts.axa === 'vendu'
    },
    offset: {
        proposed: this.state.serviceStatuts.offset === 'propose' || this.state.serviceStatuts.offset === 'vendu',
        sold: this.state.serviceStatuts.offset === 'vendu',
        palier: this.state.offsetPalier
    },
    mcp: document.getElementById('accord-mcp')?.checked || false,
    voltalis: document.getElementById('accord-voltalis')?.checked || false
}
*/

// === AJOUT DANS restoreFields() ===
// Restaurer les statuts des services :
/*
if (this.state.serviceStatuts) {
    Object.entries(this.state.serviceStatuts).forEach(([service, status]) => {
        const select = document.getElementById(`${service}-statut`);
        if (select) {
            select.value = status;
            select.className = `service-select status-${status}`;
            this.updateServiceStatusBadge(service, status);
        }
    });
}

if (this.state.offsetPalier) {
    const offsetPalierSelect = document.getElementById('offset-palier');
    if (offsetPalierSelect) {
        offsetPalierSelect.value = this.state.offsetPalier;
        this.handleOffsetPalierChange(this.state.offsetPalier);
    }
}
*/

// === AJOUT DANS updateHistoryDisplay() ===
// Modifier l'affichage des services dans l'historique :
/*
const formatServicesWithStatus = (services) => {
    const servicesList = [];
    
    if (services.axa && services.axa.sold) servicesList.push('AXA (Vendu)');
    else if (services.axa && services.axa.proposed) servicesList.push('AXA (Proposé)');
    
    if (services.offset && services.offset.sold) servicesList.push(`Offset ${services.offset.palier}€ (Vendu)`);
    else if (services.offset && services.offset.proposed) servicesList.push(`Offset ${services.offset.palier}€ (Proposé)`);
    
    if (services.mcp) servicesList.push('MCP');
    if (services.voltalis) servicesList.push('Voltalis');
    
    return servicesList;
};
*/

// === FONCTIONS GLOBALES À AJOUTER ===
window.handleServiceStatusChange = (service, status) => {
    if (window.app) {
        window.app.handleServiceStatusChange(service, status);
    }
};

window.handleOffsetPalierChange = (palier) => {
    if (window.app) {
        window.app.handleOffsetPalierChange(palier);
    }
};