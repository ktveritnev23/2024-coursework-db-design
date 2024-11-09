class Entity {
    constructor(graph, name, x, y, width, height) {
        this.graph = graph;
        this.geometry = { x, y, width, height };
        this.label = name || 'New Entity';
        this.element = this.createEntityElement();
        this.attributes = [];
        this.selected = false;
        this.resizeHandle = this.createResizeHandle();

        this.element.appendChild(this.resizeHandle);
        this.initEvents();
        this.addButton = this.createAddButton();
        this.connectionPoints = [];
        this.setConnectionPoints();
    }

    isPointInEntity(px, py) {
        return (
            px >= this.geometry.x &&
            px <= this.geometry.x + this.geometry.width &&
            py >= this.geometry.y &&
            py <= this.geometry.y + this.geometry.height
        );
    }

    createEntityElement() {
        // Создаем SVG-группу для сущности
        const entityGroup = this.createSVGElement('g', { class: 'node', transform: `translate(${this.geometry.x}, ${this.geometry.y})` });
        
        this.rect = this.createSVGElement('rect', { 
            width: this.geometry.width, 
            height: this.geometry.height, 
            fill: 'lightblue', 
            stroke: 'black', 
            'stroke-width': '1' 
        });
    
        this.text = this.createSVGElement('text', { 
            x: this.geometry.width / 2, 
            y: -5, // Смещаем текст вверх над прямоугольником
            'dominant-baseline': 'middle', 
            'text-anchor': 'middle', 
            fill: 'black', 
            'font-size': '14' 
        });
        this.text.textContent = this.label;
    
        // Добавляем текст и прямоугольник в SVG-группу
        entityGroup.appendChild(this.text);
        entityGroup.appendChild(this.rect);

        this.identifierGroup = this.createSVGElement('g', { class: 'identifiers' });
        this.attributeGroup = this.createSVGElement('g', { class: 'attributes' });
        entityGroup.appendChild(this.identifierGroup);
        entityGroup.appendChild(this.attributeGroup);
        // Добавляем группу в контейнер графа
        this.graph.container.appendChild(entityGroup);
    
        return entityGroup;
    }
    

    createSVGElement(tag, attributes) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
    }

    initEvents() {
        this.element.addEventListener('click', (event) => this.handleEntityClick(event));
        this.element.addEventListener('mousedown', (event) => this.graph.startDragging(event, this));
        this.resizeHandle.addEventListener('mousedown', (event) => this.startResizing(event));
    }

    handleEntityClick(event) {
        this.graph.selectEntity(this);
        event.stopPropagation();
    }

    createAddButton() {
        const button = document.createElement('button');
        button.textContent = '+';
        button.style.position = 'absolute';
        button.style.display = 'none';
        button.style.cursor = 'pointer';
        button.addEventListener('click', (event) => this.handleAddButtonClick(event));
        document.body.appendChild(button);
        return button;
    }

    handleAddButtonClick(event) {
        event.stopPropagation();
        this.showAddAttributePrompt();
    }

    createResizeHandle() {
        return this.createSVGElement('rect', {
            width: '10',
            height: '10',
            fill: 'red',
            x: this.geometry.width - 10,
            y: this.geometry.height - 10,
            cursor: 'nwse-resize',
            display: 'none' 
        });
    }

    startResizing(event) {
        event.stopPropagation();
        this.graph.isResizing = true;
        this.graph.selectedEntity = this;

        const rect = this.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.right;
        this.offsetY = event.clientY - rect.bottom;
        this.initialWidth = this.geometry.width;
        this.initialHeight = this.geometry.height;

        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.stopResizing.bind(this));
    }

    resize(event) {
        if (!this.graph.isResizing || this.graph.selectedEntity !== this) return;

        const newWidth = this.initialWidth + (event.clientX - (this.element.getBoundingClientRect().left + this.initialWidth));
        const newHeight = this.initialHeight + (event.clientY - (this.element.getBoundingClientRect().top + this.initialHeight));

        if (newWidth > 10) {
            this.updateWidth(newWidth);
        }
        if (newHeight > 10) {
            this.updateHeight(newHeight);
        }

        this.updateTextPosition();
        this.setConnectionPoints();
        this.graph.updateEdges();
    }

    updateWidth(newWidth) {
        this.geometry.width = newWidth;
        this.rect.setAttribute('width', newWidth);
        this.resizeHandle.setAttribute('x', newWidth - 10);
        this.updateAttributeWidth(newWidth);
    }

    updateHeight(newHeight) {
        this.geometry.height = newHeight;
        this.rect.setAttribute('height', newHeight);
        this.resizeHandle.setAttribute('y', newHeight - 10);
        this.updateAttributePositions();
    }

    updateAttributeWidth(newWidth) {
        const attributeRects = this.element.querySelectorAll('.table-cell');
        attributeRects.forEach(attributeRect => attributeRect.setAttribute('width', newWidth));
    }

    stopResizing() {
        this.graph.isResizing = false;
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.stopResizing.bind(this));
    }

    updateTextPosition() {
        this.text.setAttribute('x', this.geometry.width / 2);
        this.text.setAttribute('y', -5); // Устанавливаем y-координату над прямоугольником
    }
    

    handleAddButtonClick(event) {
        event.stopPropagation();
        this.showAddAttributePrompt();
    }
    
    showAddAttributePrompt() {
        const attributeName = prompt("Enter attribute name:");
        if (attributeName) {
            const isIdentifier = confirm("Is this an identifier?");
            this.addElement(attributeName, isIdentifier);
        }
    }

    addElement(name, isIdentifier = false) {
        this.attributes.push({ name, isIdentifier });
        
        const yPos = this.geometry.height;
    
        // Создаем элемент атрибута
        const attributeRect = this.createSVGElement('rect', {
            class: 'table-cell',
            width: this.geometry.width,
            height: '30',
            y: yPos,
            fill: 'lightgreen',
            stroke: 'black',
            'stroke-width': '1'
        });
        
        const text = this.createSVGElement('text', {
            x: '5',
            y: yPos + 20,
            fill: 'black',
            'font-size': '12',
            'text-anchor': 'start'
        });
        text.textContent = name;
    
        // Если атрибут является идентификатором, добавляем его в подгруппу идентификаторов
        if (isIdentifier) {
            this.identifierGroup.appendChild(attributeRect);
            this.identifierGroup.appendChild(text);
        } else {
            // Обычные атрибуты добавляем в обычную группу
            this.attributeGroup.appendChild(attributeRect);
            this.attributeGroup.appendChild(text);
        }
    
        // Обновляем высоту сущности и атрибутов
        this.geometry.height += 30;
        this.rect.setAttribute('height', this.geometry.height);
        this.updateResizeHandlePosition();
        this.element.appendChild(this.resizeHandle);
    
        // Обновляем позиции атрибутов
        this.updateAttributePositions();
    }
    insertIdentifierAfterLast() {
        // Находим последний идентификатор в списке атрибутов
        const lastIdentifierIndex = this.attributes.slice().reverse().findIndex(attr => attr.isIdentifier);
        const insertIndex = lastIdentifierIndex === -1 ? 0 : this.attributes.length - lastIdentifierIndex - 1;
    
        const attributeRects = this.element.querySelectorAll('.table-cell');
        const textElements = this.element.querySelectorAll('text');
    
        // Получаем все атрибуты и перемещаем их вниз
        const currentYPos = this.geometry.height;
        for (let i = this.attributes.length - 1; i > insertIndex; i--) {
            const attributeRect = attributeRects[i];
            const textElement = textElements[i];
    
            // Смещаем атрибуты и текст вниз
            const newYPos = currentYPos + (30 * (this.attributes.length - 1 - i));
            attributeRect.setAttribute('y', newYPos);
            textElement.setAttribute('y', newYPos + 20);
        }
    
        // Устанавливаем новый атрибут на его место
        const newRect = attributeRects[insertIndex];
        const newText = textElements[insertIndex];
        newRect.setAttribute('y', currentYPos);
        newText.setAttribute('y', currentYPos + 20);
    }
    

    updateResizeHandlePosition() {
        this.resizeHandle.setAttribute('x', this.geometry.width - 10);
        this.resizeHandle.setAttribute('y', this.geometry.height - 10);
    }

    updateLastAttributePosition() {
        const attributeRects = this.element.querySelectorAll('.table-cell');
        const lastAttribute = attributeRects[attributeRects.length - 1];

        if (lastAttribute) {
            const lastYPos = this.geometry.height - 30;
            lastAttribute.setAttribute('y', lastYPos);
            const text = lastAttribute.nextElementSibling;
            if (text) {
                text.setAttribute('y', lastYPos + 20);
            }
        }
    }

    updateAttributePositions() {
        const attributeRects = this.element.querySelectorAll('.table-cell');

        attributeRects.forEach((attributeRect, index) => {
            const newYPos = this.geometry.height - (30 * (attributeRects.length - index));
            attributeRect.setAttribute('y', newYPos);

            const text = attributeRect.nextElementSibling;
            if (text) {
                text.setAttribute('y', newYPos + 20);
            }
        });

        this.resizeHandle.setAttribute('y', this.geometry.height - 10);
    }

    showButton() {
        const { x, y } = this.geometry;
        this.addButton.style.left = `${x + this.geometry.width}px`;
        this.addButton.style.top = `${y}px`;
        this.addButton.style.display = 'block';
    }

    hideButton() {
        this.addButton.style.display = 'none';
    }

    setConnectionPoints() {
        const { x, y, width, height } = this.geometry;
        this.connectionPoints = [
            { x: x + width / 5, y: y },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 },
            { x: x + width, y: y + height / 2 }
        ];
    }

    findClosestConnectionPoint(targetEntity) {
        this.setConnectionPoints();

        const targetCenterX = targetEntity.geometry.x + targetEntity.geometry.width / 2;
        const targetCenterY = targetEntity.geometry.y + targetEntity.geometry.height / 2;

        return this.connectionPoints.reduce((closestPoint, point) => {
            const distance = this.calculateDistance(point, { x: targetCenterX, y: targetCenterY });
            if (distance < closestPoint.distance) {
                return { point, distance };
            }
            return closestPoint;
        }, { point: null, distance: Infinity }).point;
    }

    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getConnectionPoint() {
        this.setConnectionPoints();
        const centerX = this.geometry.x + this.geometry.width / 2;
        const centerY = this.geometry.y + this.geometry.height / 2;

        if (this.connectionPoints.length > 0) {
            return this.findClosestConnectionPoint({ geometry: { x: centerX, y: centerY, width: 0, height: 0 } });
        }
        return null;
    }
}