class Entity {
    constructor(graph, name, x, y, width, height, isStrong, isRelational = false) {
        this.graph = graph;
        this.geometry = { x, y, width, height };
        this.label = name || 'New Entity';
        this.isStrong = isStrong;
        this.isRelational = isRelational;
        this.initialFillColor = this.isStrong ? '#77dd77' : '#ffc26c';
        this.element = this.createEntityElement();
        this.attributes = [];
        this.selected = false;
        this.resizeHandle = this.createResizeHandle();

        this.element.appendChild(this.resizeHandle);
        this.initEvents();
        this.connectionPoints = [];
        this.setConnectionPoints();
        this.hasPrimaryAttribute = false;

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
        const entityGroup = this.createSVGElement('g', { class: 'node', transform: `translate(${this.geometry.x}, ${this.geometry.y})` });

        this.rect = this.createSVGElement('rect', {
            width: this.geometry.width,
            height: this.geometry.height,
            fill: this.initialFillColor,
            stroke: 'black',
            'stroke-width': '1',
            rx: this.borderRadius,
            ry: this.borderRadius
        });

        this.text = this.createSVGElement('text', {
            x: this.geometry.width / 2,
            y: -5,
            'dominant-baseline': 'middle',
            'text-anchor': 'middle',
            fill: 'black',
            'font-size': '12'
        });
        this.text.textContent = this.label;

        entityGroup.appendChild(this.text);
        entityGroup.appendChild(this.rect);

        this.identifierGroup = this.createSVGElement('g', { class: 'identifiers' });
        this.attributeGroup = this.createSVGElement('g', { class: 'attributes' });
        entityGroup.appendChild(this.identifierGroup);
        entityGroup.appendChild(this.attributeGroup);
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
        deleteEntityButton.style.display = 'block';

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

        const rect = this.element.getBoundingClientRect();
        const deltaX = event.clientX - rect.left;
        const deltaY = event.clientY - rect.top;

        const newWidth = Math.max(this.calculateMinWidth(), deltaX);
        const newHeight = Math.max(this.calculateMinHeight(), deltaY);

        this.updateWidth(newWidth);
        this.updateHeight(newHeight);

        this.updateTextPosition();
        this.setConnectionPoints();
        this.graph.updateEdges();
    }

    calculateMinWidth() {
        let minWidth = 0;

        this.attributes.forEach(attr => {
            const fullText = this.isRelational
                ? `${attr.name}: ${attr.type || ''}${['int', 'nvarchar'].includes(attr.type) && attr.length ? `(${attr.length})` : ''}${attr.isNull ? ' NULL' : ' NOT NULL'}${attr.isForeignKey ? ' (FK)' : ''}`
                : attr.name;

            const tempText = this.createSVGElement('text', {
                'font-size': '12',
                'dominant-baseline': 'middle',
            });
            tempText.textContent = fullText;
            this.graph.container.appendChild(tempText);

            const textWidth = tempText.getBBox().width;
            this.graph.container.removeChild(tempText);

            minWidth = Math.max(minWidth, textWidth + 30);
        });

        return minWidth;
    }


    calculateMinHeight() {
        const tempText = this.createSVGElement('text', {
            'font-size': '12',
            'dominant-baseline': 'middle'
        });
        tempText.textContent = 'Sample';
        this.graph.container.appendChild(tempText);
        const textHeight = tempText.getBBox().height;
        this.graph.container.removeChild(tempText);

        return this.attributes.length * (textHeight + 10);
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
        this.updateResizeHandlePosition();
        this.updateAttributePositions();
    }


    updateAttributeWidth(newWidth) {
        const attributeRects = this.element.querySelectorAll('.table-cell');
        attributeRects.forEach(attributeRect => attributeRect.setAttribute('width', newWidth));
    }

    updateResizeHandlePosition() {
        this.resizeHandle.setAttribute('x', this.geometry.width - 10);
        this.resizeHandle.setAttribute('y', this.geometry.height - 10);
    }

    updateAttributePositions() {
        const attributeRects = this.element.querySelectorAll('.table-cell');

        const attributeCount = attributeRects.length;

        if (attributeCount === 0) return;

        const totalHeight = this.geometry.height;
        const heightPerAttribute = totalHeight / attributeCount;

        attributeRects.forEach((attributeRect, index) => {
            const newYPos = heightPerAttribute * index;
            attributeRect.setAttribute('y', newYPos);
            attributeRect.setAttribute('height', heightPerAttribute);

            const text = attributeRect.nextElementSibling;
            if (text) {
                text.setAttribute('y', newYPos + heightPerAttribute / 2);
            }
        });

        this.resizeHandle.setAttribute('y', totalHeight - 10);
    }


    stopResizing() {
        this.graph.isResizing = false;
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.stopResizing.bind(this));
    }

    updateTextPosition() {
        this.text.textContent = this.label;
        this.text.setAttribute('x', this.geometry.width / 2);
        this.text.setAttribute('y', -5);
    }

    handleAddButtonClick(event) {
        event.stopPropagation();
    }

    addElement(name, isIdentifier = false, isNull = false, isForeignKey = false, type = 'nvarchar', length = undefined) {
        this.attributes.push({
            name,
            isIdentifier,
            isNull,
            isForeignKey,
            type,
            length
        });
        this.updateAttributesOnCanvas();
    }


    updateAttributesOnCanvas() {
        const cellHeight = 30;

        this.identifierGroup.innerHTML = '';
        this.attributeGroup.innerHTML = '';

        let maxWidth = Math.max(this.geometry.width, this.calculateMinWidth()); // Учитываем минимальную ширину

        const identifiers = this.attributes.filter(attr => attr.isIdentifier);
        const attributes = this.attributes.filter(attr => !attr.isIdentifier);

        let yPos = 0;

        identifiers.forEach(attr => {
            const cellColor = this.isStrong ? '#4fc14f' : '#e9a039';
            const fullText = this.isRelational
                ? `${attr.name}: ${attr.type || ''}${['int', 'nvarchar'].includes(attr.type) && attr.length ? `(${attr.length})` : ''}${attr.isNull ? ' NULL' : ' NOT NULL'}${attr.isForeignKey ? ' (FK)' : ''}`
                : attr.name;

            const attributeRect = this.createSVGElement('rect', {
                class: 'table-cell',
                width: maxWidth,
                height: cellHeight,
                y: yPos,
                fill: cellColor,
                stroke: 'none',
            });

            const text = this.createSVGElement('text', {
                x: this.isRelational ? 20 : 5,
                y: yPos + cellHeight / 2 + 4,
                fill: 'black',
                'font-size': '12',
                'text-anchor': 'start',
                'alignment-baseline': 'middle',
            });
            text.textContent = fullText;

            this.identifierGroup.appendChild(attributeRect);
            this.identifierGroup.appendChild(text);

            if (this.isRelational) {
                const keyIcon = this.createSVGElement('image', {
                    href: './assets/key.png',
                    x: 5,
                    y: yPos + (cellHeight - 12) / 2,
                    width: 12,
                    height: 12,
                });
                this.identifierGroup.appendChild(keyIcon);
                attributeRect.keyIcon = keyIcon;
            }

            yPos += cellHeight;
        });

        attributes.forEach(attr => {
            const fullText = this.isRelational
                ? `${attr.name}: ${attr.type || ''}${['int', 'nvarchar'].includes(attr.type) && attr.length ? `(${attr.length})` : ''}${attr.isNull ? ' NULL' : ' NOT NULL'}${attr.isForeignKey ? ' (FK)' : ''}`
                : attr.name;

            const attributeRect = this.createSVGElement('rect', {
                class: 'table-cell',
                width: maxWidth,
                height: cellHeight,
                y: yPos,
                fill: this.initialFillColor,
                stroke: 'none',
            });

            const text = this.createSVGElement('text', {
                x: 5,
                y: yPos + cellHeight / 2 + 4,
                fill: 'black',
                'font-size': '12',
                'text-anchor': 'start',
                'alignment-baseline': 'middle',
            });
            text.textContent = fullText;

            this.attributeGroup.appendChild(attributeRect);
            this.attributeGroup.appendChild(text);

            yPos += cellHeight;
        });

        this.geometry.width = maxWidth;
        this.geometry.height = yPos;
        this.rect.setAttribute('width', maxWidth);
        this.rect.setAttribute('height', this.geometry.height);

        this.updateResizeHandlePosition();
    }



    setConnectionPoints() {
        const { x, y, width, height } = this.geometry;
        this.connectionPoints = [
            { x: x + width / 2, y: y },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 },
            { x: x + width, y: y + height / 2 }
        ];
    }
    getConnectionPointSide(connectionPoint) {
        const { x, y } = connectionPoint;
        const { x: entityX, y: entityY, width, height } = this.geometry;
        const tolerance = 1;

        if (Math.abs(x - entityX) <= tolerance) {
            return 0;
        } else if (Math.abs(x - (entityX + width)) <= tolerance) {
            return 1;
        } else if (Math.abs(y - entityY) <= tolerance) {
            return 2;
        } else if (Math.abs(y - (entityY + height)) <= tolerance) {
            return 3;
        }

        console.warn("Connection point is out of bounds:", connectionPoint);
        return -1;
    }

    findClosestConnectionPoints(targetEntity) {
        this.setConnectionPoints();
        targetEntity.setConnectionPoints();
        console.log("targetEntity connectionPoints in findMethod", targetEntity.connectionPoints);
        let minDistance = Infinity;
        let closestPoints = { start: null, end: null };

        for (const point1 of this.connectionPoints) {
            for (const point2 of targetEntity.connectionPoints) {
                const distance = this.calculateDistance(point1, point2);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoints.start = point1;
                    closestPoints.end = point2;
                }
            }
        }

        return closestPoints;
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

class GraphHandler {
    constructor(container) {
        this.container = container;
        this.cells = [];
        this.edges = [];
        this.selectedEntity = null;
        this.selectionModel = new SelectionModel(this);
        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.initEvents();
    }

    initEvents() {
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('mouseup', () => this.onMouseUp());
        this.container.addEventListener('click', () => this.selectionModel.deselect());
    }
    logCells() {
        console.log(`Total entities in the graph: ${this.cells.length}`);
        // this.cells.forEach((entity, index) => {
        //     console.log(`Entity ${index + 1}:`);
        //     console.log(`Name: ${entity.label}`);
        //     console.log(`Position: (${entity.geometry.x}, ${entity.geometry.y})`);
        //     console.log(`Size: ${entity.geometry.width}x${entity.geometry.height}`);
        //     console.log(`Is Strong: ${entity.isStrong}`);
        //     console.log(`Attributes: ${entity.attributes.map(attr => attr.name).join(', ')}`);
        //     console.log(`Identifiers: ${entity.attributes.filter(attr => attr.isIdentifier).map(attr => attr.name).join(', ')}`);
        // });
    }
    saveGraphState() {
        const graphState = {
            entities: this.cells.map(entity => this.serializeEntity(entity)),
            edges: this.edges.map(edge => this.serializeEdge(edge))
        };

        const jsonString = JSON.stringify(graphState, null, 2);

        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'graphState.json';
        link.click();
    }

    serializeEntity(entity) {
        return {
            name: entity.label,
            x: entity.geometry.x,
            y: entity.geometry.y,
            width: entity.geometry.width,
            height: entity.geometry.height,
            isStrong: entity.isStrong,
            attributes: entity.attributes.filter(attr => !attr.isIdentifier).map(attr => attr.name), // Only regular attributes
            identifiers: entity.attributes.filter(attr => attr.isIdentifier).map(attr => attr.name) // Only identifiers
        };
    }

    serializeEdge(edge) {
        const pointsString = edge.element.getAttribute('points');
        const pointsArray = pointsString.split(' ').map(point => {
            const [x, y] = point.split(',');
            return { x: parseFloat(x), y: parseFloat(y) };
        });

        return {
            isStandalone: edge.isStandalone,
            entity1: edge.entity1 ? edge.entity1.label : null,
            entity2: edge.entity2 ? edge.entity2.label : null,
            points: pointsArray
        };
    }


    loadState(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const graphState = JSON.parse(e.target.result);
                this.cells = [];
                this.edges = [];

                graphState.entities.forEach(entityData => {
                    const entity = new Entity(
                        this,
                        entityData.name,
                        entityData.x,
                        entityData.y,
                        entityData.width,
                        entityData.height,
                        entityData.isStrong
                    );

                    if (entityData.identifiers.length > 0) {
                        entityData.identifiers.forEach(identifier => {
                            entity.addElement(identifier, true);
                        });
                    }

                    if (entityData.attributes.length > 0) {
                        entityData.attributes.forEach(attribute => {
                            entity.addElement(attribute, false);
                        });
                    }

                    this.cells.push(entity);
                    this.container.appendChild(entity.element);
                });

                graphState.edges.forEach(edgeData => {
                    let entity1 = null, entity2 = null;

                    if (edgeData.entity1) {
                        entity1 = this.cells.find(e => e.label === edgeData.entity1);
                    }
                    if (edgeData.entity2) {
                        entity2 = this.cells.find(e => e.label === edgeData.entity2);
                    }

                    const edge = new Edge(this, entity1, entity2, edgeData.isStandalone);

                    edge.element.setAttribute('points', edgeData.points.map(p => `${p.x},${p.y}`).join(' '));
                    edge.updateHandles();

                    this.container.appendChild(edge.element);
                    this.container.appendChild(edge.handle1);
                    this.container.appendChild(edge.handle2);

                    this.edges.push(edge);
                });
                this.logCells();
            } catch (err) {
                console.error('error:', err);
            }
        };
        reader.readAsText(file);
    }
    onMouseMove(event) {
        if (this.isDragging) {
            this.moveEntity(event);
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.selectedEntity = null;
    }

    addEntity(entity) {
        this.cells.push(entity);
        this.logCells()
    }

    addEdge(entity1, entity2) {
        const edge = new Edge(this, entity1, entity2);
        this.edges.push(edge);
        edge.updatePosition();
    }

    addEdgeStandalone(x1, y1, x2, y2, handle1Type = 'oneOptional', handle2Type = 'manyMandatory') {
        const edge = new Edge(this, null, null, true, handle1Type, handle2Type);
        edge.setStandalonePosition(x1, y1, x2, y2);
        this.edges.push(edge);
    }

    updateEdges() {
        this.edges.forEach(edge => edge.updatePosition());
    }

    selectEntity(entity) {
        this.selectionModel.selectElement(entity);
    }

    selectEdge(edge) {
        this.selectionModel.selectEdge(edge);
    }

    startDragging(event, entity) {
        this.isDragging = true;
        this.selectedEntity = entity;
        this.setDraggingOffsets(event);
        event.stopPropagation();
    }

    setDraggingOffsets(event) {
        const rect = this.selectedEntity.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
    }

    moveEntity(event) {
        if (this.selectedEntity) {
            const { newX, newY } = this.calculateNewPosition(event);
            this.updateEntityPosition(newX, newY);
            this.updateEdges();
        }
    }

    calculateNewPosition(event) {
        const newX = event.clientX - this.offsetX;
        const newY = event.clientY - this.offsetY;
        return { newX, newY };
    }

    updateEntityPosition(newX, newY) {
        this.selectedEntity.geometry.x = newX;
        this.selectedEntity.geometry.y = newY;
        this.selectedEntity.element.setAttribute('transform', `translate(${newX}, ${newY})`);
    }

    deleteEntity(entity) {
        this.cells = this.cells.filter(cell => cell !== entity);
        this.container.removeChild(entity.element);
        this.edges = this.edges.filter(edge => {
            const isConnected = edge.entity1 === entity || edge.entity2 === entity;
            if (isConnected) {
                this.container.removeChild(edge.element);
                if (edge.handle1) this.container.removeChild(edge.handle1);
                if (edge.handle2) this.container.removeChild(edge.handle2);
            }
            return !isConnected;
        });
        this.selectionModel.deselect();
    }

}

class SelectionModel {
    constructor(graph) {
        this.graph = graph;
        this.selectedElement = null;
    }

    selectElement(entity) {
        this.clearPreviousSelection();
        this.selectedElement = entity;
        this.highlightSelection(entity);
        this.showResizeHandle(entity);
        displaySelectedEntityData(entity);
        this.closeOpenPanels();
    }

    closeOpenPanels() {
        const entityOptions = document.getElementById('entityOptions');
        const edgeOptions = document.getElementById('edgeOptions');

        if (entityOptions) {
            entityOptions.style.display = 'none';
        }
        if (edgeOptions) {
            edgeOptions.style.display = 'none';
        }
    }

    selectEdge(edge) {
        this.clearPreviousSelection();
        this.selectedElement = edge;
        this.highlightSelection(edge);
    }

    clearPreviousSelection() {
        if (this.selectedElement) {
            this.clearSelection(this.selectedElement);
        }
    }

    clearSelection(element) {
        if (element instanceof Entity) {
            this.clearEntitySelection(element);
        } else if (element instanceof Edge) {
            element.deselect();
        }
        clearSelectedEntityData();
        deleteEntityButton.style.display = 'none';

    }

    clearEntitySelection(entity) {
        entity.rect.setAttribute('stroke', 'black');
        this.hideResizeHandle(entity);
    }

    hideResizeHandle(entity) {
        entity.resizeHandle.setAttribute('display', 'none');
    }

    showResizeHandle(entity) {
        entity.resizeHandle.setAttribute('display', 'block');
    }

    highlightSelection(element) {
        if (element instanceof Entity) {
            this.highlightEntitySelection(element);
        } else if (element instanceof Edge) {
            element.select();
        }
    }

    highlightEntitySelection(entity) {
        entity.rect.setAttribute('stroke', 'red');
    }

    deselect() {
        if (this.selectedElement) {
            this.clearSelection(this.selectedElement);
            this.selectedElement = null;
        }
    }
}

class Edge {
    constructor(graph, entity1 = null, entity2 = null, isStandalone = false, handle1Type = 'oneOptional', handle2Type = 'manyMandatory') {
        this.graph = graph;
        this.entity1 = entity1;
        this.entity2 = entity2;
        this.isStandalone = isStandalone;
        this.selected = false;
        this.isDragging = false;
        this.draggingHandle = null;
        this.dragStart = { x: 0, y: 0 };

        this.element = this.createEdgeElement();
        this.handle1 = this.createHandle(handle1Type);
        this.handle2 = this.createHandle(handle2Type);

        this.graph.container.appendChild(this.element);
        this.graph.container.appendChild(this.handle1);
        this.graph.container.appendChild(this.handle2);

        this.initDragEvents();
        this.initEvents();

        if (this.entity1 && this.entity2) {
            this.updatePosition();
        }
    }

    createEdgeElement() {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('stroke', 'black');
        polyline.setAttribute('stroke-width', '1.5');
        polyline.setAttribute('fill', 'none');
        return polyline;
    }

    createHandle(type) {
        // Создаем группу элементов
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', 'translate(0, 0)');
      
        // Создаем первую черточку перед кружком
        if (type === 'manyOptional') {
            /*const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', '10'); // Начало линии (настраивается позже)
            line1.setAttribute('y1', '-5');
            line1.setAttribute('x2', '10');
            line1.setAttribute('y2', '5');
            line1.setAttribute('stroke', 'black');
            line1.setAttribute('stroke-width', '2');
          */
            // Создаем кружок
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '10');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '5');
            circle.setAttribute('stroke', 'black');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('fill', 'none');
          
            // Создаем первую диагональную черточку
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', '0');
            line2.setAttribute('y1', '0');
            line2.setAttribute('x2', '-10'); // Угол π/4 (настраивается позже)
            line2.setAttribute('y2', '-10');
            line2.setAttribute('stroke', 'black');
            line2.setAttribute('stroke-width', '1');
          
            // Создаем вторую диагональную черточку
            const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line3.setAttribute('x1', '0');
            line3.setAttribute('y1', '0');
            line3.setAttribute('x2', '-10'); // Угол 5π/4 (настраивается позже)
            line3.setAttribute('y2', '10');
            line3.setAttribute('stroke', 'black');
            line3.setAttribute('stroke-width', '1');
          
            // Создаем черточку, которая идет из кружка и совпадает с ребром
            const line4 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line4.setAttribute('x1', '10');
            line4.setAttribute('y1', '0');
            line4.setAttribute('x2', '-10'); // Это будет точка, куда ребро должно направляться, например вправо
            line4.setAttribute('y2', '0');  // Это будет точка на оси X, при необходимости можно скорректировать для вертикальной оси
            line4.setAttribute('stroke', 'black');
            line4.setAttribute('stroke-width', '1');
          
            // Добавляем элементы в группу
            //group.appendChild(line1);
            group.appendChild(circle);
            group.appendChild(line2);
            group.appendChild(line3);
            group.appendChild(line4);  // Добавляем новую черточку
        } else if (type === 'oneMandatory') {
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', '8'); // Начало линии (настраивается позже)
            line1.setAttribute('y1', '-5');
            line1.setAttribute('x2', '8');
            line1.setAttribute('y2', '5');
            line1.setAttribute('stroke', 'black');
            line1.setAttribute('stroke-width', '1');

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', '14'); // Начало линии (настраивается позже)
            line2.setAttribute('y1', '-5');
            line2.setAttribute('x2', '14');
            line2.setAttribute('y2', '5');
            line2.setAttribute('stroke', 'black');
            line2.setAttribute('stroke-width', '1');

            const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line3.setAttribute('x1', '10');
            line3.setAttribute('y1', '0');
            line3.setAttribute('x2', '-10'); // Это будет точка, куда ребро должно направляться, например вправо
            line3.setAttribute('y2', '0');  // Это будет точка на оси X, при необходимости можно скорректировать для вертикальной оси
            line3.setAttribute('stroke', 'black');
            line3.setAttribute('stroke-width', '1');

            group.appendChild(line1);
            group.appendChild(line2);
            group.appendChild(line3);

        } else if (type === 'manyMandatory') {
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', '10'); // Начало линии (настраивается позже)
            line1.setAttribute('y1', '-5');
            line1.setAttribute('x2', '10');
            line1.setAttribute('y2', '5');
            line1.setAttribute('stroke', 'black');
            line1.setAttribute('stroke-width', '1');
    
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', '0');
            line2.setAttribute('y1', '0');
            line2.setAttribute('x2', '-10'); // Угол π/4 (настраивается позже)
            line2.setAttribute('y2', '-10');
            line2.setAttribute('stroke', 'black');
            line2.setAttribute('stroke-width', '1');
    
            const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line3.setAttribute('x1', '0');
            line3.setAttribute('y1', '0');
            line3.setAttribute('x2', '-10'); // Угол 5π/4 (настраивается позже)
            line3.setAttribute('y2', '10');
            line3.setAttribute('stroke', 'black');
            line3.setAttribute('stroke-width', '1');
    
            const line4 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line4.setAttribute('x1', '-5');
            line4.setAttribute('y1', '0');
            line4.setAttribute('x2', '-10'); // Это будет точка, куда ребро должно направляться
            line4.setAttribute('y2', '0');  // Это будет точка на оси X
            line4.setAttribute('stroke', 'black');
            line4.setAttribute('stroke-width', '1');
    
            const line5 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line5.setAttribute('x1', '10');
            line5.setAttribute('y1', '0');
            line5.setAttribute('x2', '-10'); // Это будет точка, куда ребро должно направляться, например вправо
            line5.setAttribute('y2', '0');  // Это будет точка на оси X, при необходимости можно скорректировать для вертикальной оси
            line5.setAttribute('stroke', 'black');
            line5.setAttribute('stroke-width', '1');
            
            group.appendChild(line1);
            group.appendChild(line2);
            group.appendChild(line3);
            group.appendChild(line4);
            group.appendChild(line5);
        } else if (type === 'oneOptional') {
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', '10'); // Начало линии (настраивается позже)
            line1.setAttribute('y1', '-5');
            line1.setAttribute('x2', '10');
            line1.setAttribute('y2', '5');
            line1.setAttribute('stroke', 'black');
            line1.setAttribute('stroke-width', '1');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '5');
            circle.setAttribute('stroke', 'black');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('fill', 'none');

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', '10');
            line2.setAttribute('y1', '0');
            line2.setAttribute('x2', '-7'); // Это будет точка, куда ребро должно направляться, например вправо
            line2.setAttribute('y2', '0');  // Это будет точка на оси X, при необходимости можно скорректировать для вертикальной оси
            line2.setAttribute('stroke', 'black');
            line2.setAttribute('stroke-width', '1');

            group.appendChild(line1);
            group.appendChild(line2);
            group.appendChild(circle);
        }      
        return group;
    }

    setStandalonePosition(x1, y1, x2, y2) {
        const points = this.createPolylinePath({ x: x1, y: y1 }, { x: x2, y: y2 });
        this.element.setAttribute('points', points);
        this.updateHandles();
        this.updateAppearance();
    }

    createPolylinePath(start, end) {
        const points = [];

        if (!this.entity1 && !this.entity2) {
            const deltaX = Math.abs(start.x - end.x);
            const deltaY = Math.abs(start.y - end.y);

            if (deltaX > deltaY) {
                const middleX = (start.x + end.x) / 2;
                points.push(
                    { x: start.x, y: start.y },
                    { x: middleX, y: start.y },
                    { x: middleX, y: end.y },
                    { x: end.x, y: end.y }
                );
            } else {
                const middleY = (start.y + end.y) / 2;
                points.push(
                    { x: start.x, y: start.y },
                    { x: start.x, y: middleY },
                    { x: end.x, y: middleY },
                    { x: end.x, y: end.y }
                );
            }
        } else if (this.entity1 && !this.entity2) {
            const side = this.entity1.getConnectionPointSide(start)
            const middleX = (start.x + end.x) / 2;
            const middleY = (start.y + end.y) / 2;
            if (side == 0 || side == 1) {
                points.push(
                    { x: start.x, y: start.y },
                    { x: middleX, y: start.y },
                    { x: middleX, y: end.y },
                    { x: end.x, y: end.y }
                );
            } else {
                points.push(
                    { x: start.x, y: start.y },
                    { x: start.x, y: middleY },
                    { x: end.x, y: middleY },
                    { x: end.x, y: end.y }
                );
            }
        } else if (!this.entity1 && this.entity2) {
            console.log("entity2 существует")
            const side = this.entity2.getConnectionPointSide(end)
            console.log("end", end)
            console.log(side)

            const middleX = (start.x + end.x) / 2;
            const middleY = (start.y + end.y) / 2;

            if (side == 0 || side == 1) {
                points.push(
                    { x: start.x, y: start.y },
                    { x: middleX, y: start.y },
                    { x: middleX, y: end.y },
                    { x: end.x, y: end.y }
                );
            } else {
                points.push(
                    { x: start.x, y: start.y },
                    { x: start.x, y: middleY },
                    { x: end.x, y: middleY },
                    { x: end.x, y: end.y }
                );
            }

        } else {
            const side1 = this.entity1.getConnectionPointSide(start);
            const side2 = this.entity2.getConnectionPointSide(end);
            const middleX = (start.x + end.x) / 2;
            const middleY = (start.y + end.y) / 2;
            if ((side1 === 0 || side1 === 1) && (side2 === 0 || side2 === 1)) {
                points.push(
                    { x: start.x, y: start.y },
                    { x: middleX, y: start.y },
                    { x: middleX, y: end.y },
                    { x: end.x, y: end.y }
                );
            } else if ((side1 === 2 || side1 === 3) && (side2 === 2 || side2 === 3)) {
                points.push(
                    { x: start.x, y: start.y },
                    { x: start.x, y: middleY },
                    { x: end.x, y: middleY },
                    { x: end.x, y: end.y }
                );
            } else {
                points.push(
                    { x: start.x, y: start.y },
                    { x: start.x, y: end.y },
                    { x: end.x, y: end.y },
                    { x: end.x, y: end.y }
                );
            }
        }
        return points.map(p => `${p.x},${p.y}`).join(' ');
    }

    updateHandles() {
        const points = this.element.getAttribute('points').split(' ');
    
        const x1 = parseFloat(points[0].split(',')[0]);
        const y1 = parseFloat(points[0].split(',')[1]);
    
        const x2 = parseFloat(points[3].split(',')[0]);
        const y2 = parseFloat(points[3].split(',')[1]);
    
        const offset = 10; 
    
        // Перемещаем группы в соответствующие позиции с учетом отступа
        this.handle1.setAttribute('transform', `translate(${x1}, ${y1})`);
        this.handle2.setAttribute('transform', `translate(${x2}, ${y2})`);
    
        // Если обе сущности привязаны
        if (this.entity1 && this.entity2) {
            const side1 = this.entity1.getConnectionPointSide({ x: x1, y: y1 });
            const side2 = this.entity2.getConnectionPointSide({ x: x2, y: y2 });
    
            console.log(`handle1 на стороне: ${side1}, handle2 на стороне: ${side2}`);
    
            // Поворот для handle1 (в зависимости от того, на какой стороне entity1)
            switch (side1) {
                case 0: // Левая сторона
                    this.handle1.setAttribute('transform', `translate(${x1 - offset}, ${y1}) rotate(180)`);
                    console.log("handle1: поворот на 180 градусов (левая сторона)");
                    break;
                case 1: // Правая сторона
                    this.handle1.setAttribute('transform', `translate(${x1 + offset}, ${y1}) rotate(0)`);
                    console.log("handle1: поворот на 0 градусов (правая сторона)");
                    break;
                case 2: // Верхняя сторона
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 - offset}) rotate(-90)`);
                    console.log("handle1: поворот на -90 градусов (верхняя сторона)");
                    break;
                case 3: // Нижняя сторона
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 + offset}) rotate(90)`);
                    console.log("handle1: поворот на 90 градусов (нижняя сторона)");
                    break;
                default:
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1})`);
            }
    
            switch (side2) {
                case 0: // Левая сторона
                    this.handle2.setAttribute('transform', `translate(${x2 - offset}, ${y2}) rotate(180)`);
                    console.log("handle2: поворот на 180 градусов (левая сторона)");
                    break;
                case 1: // Правая сторона
                    this.handle2.setAttribute('transform', `translate(${x2 + offset}, ${y2}) rotate(0)`);
                    console.log("handle2: поворот на 0 градусов (правая сторона)");
                    break;
                case 2: // Верхняя сторона
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 - offset}) rotate(-90)`);
                    console.log("handle2: поворот на -90 градусов (верхняя сторона)");
                    break;
                case 3: // Нижняя сторона
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 + offset}) rotate(90)`);
                    console.log("handle2: поворот на 90 градусов (нижняя сторона)");
                    break;
                default:
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2})`);
            }
        } else if (this.entity1) {
            // Если привязана только первая сущность
            const side1 = this.entity1.getConnectionPointSide({ x: x1, y: y1 });
            console.log(`handle1 на стороне: ${side1}, handle2 не привязана`);
    
            switch (side1) {
                case 0: // Левая сторона
                    this.handle1.setAttribute('transform', `translate(${x1 - offset}, ${y1}) rotate(180)`);
                    console.log("handle1: поворот на 180 градусов (левая сторона)");
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2}) rotate(0)`); // Второй наконечник
                    break;
                case 1: // Правая сторона
                    this.handle1.setAttribute('transform', `translate(${x1 + offset}, ${y1}) rotate(0)`);
                    console.log("handle1: поворот на 0 градусов (правая сторона)");
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2}) rotate(180)`); // Второй наконечник
                    break;
                case 2: // Верхняя сторона
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 - offset}) rotate(-90)`);
                    console.log("handle1: поворот на -90 градусов (верхняя сторона)");
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2}) rotate(90)`); // Второй наконечник
                    break;
                case 3: // Нижняя сторона
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 + offset}) rotate(90)`);
                    console.log("handle1: поворот на 90 градусов (нижняя сторона)");
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2}) rotate(-90)`); // Второй наконечник
                    break;
                default:
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1})`);
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2})`);
            }
    
        } else if (this.entity2) {
            // Если привязана только вторая сущность
            const side2 = this.entity2.getConnectionPointSide({ x: x2, y: y2 });
            console.log(`handle2 на стороне: ${side2}, handle1 не привязана`);
    
            switch (side2) {
                case 0: // Левая сторона
                    this.handle2.setAttribute('transform', `translate(${x2 - offset}, ${y2}) rotate(180)`);
                    console.log("handle2: поворот на 180 градусов (левая сторона)");
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1}) rotate(0)`); // Первый наконечник
                    break;
                case 1: // Правая сторона
                    this.handle2.setAttribute('transform', `translate(${x2 + offset}, ${y2}) rotate(0)`);
                    console.log("handle2: поворот на 0 градусов (правая сторона)");
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1}) rotate(180)`); // Первый наконечник
                    break;
                case 2: // Верхняя сторона
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 - offset}) rotate(-90)`);
                    console.log("handle2: поворот на -90 градусов (верхняя сторона)");
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1}) rotate(90)`); // Первый наконечник
                    break;
                case 3: // Нижняя сторона
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 + offset}) rotate(90)`);
                    console.log("handle2: поворот на 90 градусов (нижняя сторона)");
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1}) rotate(-90)`); // Первый наконечник
                    break;
                default:
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2})`);
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1})`);
            }
        } else {
            const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
            console.log(`isVertical: ${isVertical}`);
    
            if (isVertical) {
                if (y1 < y2) {
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 - offset}) rotate(90)`);
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 + offset}) rotate(-90)`);
                    console.log("Ребро вертикальное: handle1 поворачивается на 90 градусов, handle2 на -90");
                } else {
                    this.handle1.setAttribute('transform', `translate(${x1}, ${y1 + offset}) rotate(-90)`);
                    this.handle2.setAttribute('transform', `translate(${x2}, ${y2 - offset}) rotate(90)`);
                    console.log("Ребро вертикальное: handle1 поворачивается на -90 градусов, handle2 на 90");
                }
            } else {
                if (x1 < x2) {
                    this.handle1.setAttribute('transform', `translate(${x1 - offset}, ${y1}) rotate(0)`);
                    this.handle2.setAttribute('transform', `translate(${x2 + offset}, ${y2}) rotate(180)`);
                    console.log("Ребро горизонтальное: handle1 без поворота, handle2 на 180 градусов");
                } else {
                    this.handle1.setAttribute('transform', `translate(${x1 + offset}, ${y1}) rotate(180)`);
                    this.handle2.setAttribute('transform', `translate(${x2 - offset}, ${y2}) rotate(0)`);
                    console.log("Ребро горизонтальное: handle1 на 180 градусов, handle2 без поворота");
                }
            }
        }
    }

    initDragEvents() {
        this.handle1.addEventListener('mousedown', (event) => this.startHandleDrag(event, this.handle1));
        this.handle2.addEventListener('mousedown', (event) => this.startHandleDrag(event, this.handle2));
        this.element.addEventListener('mousedown', (event) => this.startEdgeDrag(event));

        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('mouseup', () => this.endDrag());
    }

    startHandleDrag(event, handle) {
        if ((handle === this.handle1 && this.entity1) || (handle === this.handle2 && this.entity2)) {
            return;
        }
        this.draggingHandle = handle;
        event.stopPropagation();
    }

    startEdgeDrag(event) {
        if (this.selected && this.isStandalone) {
            this.isDragging = true;
            this.dragStart = { x: event.clientX, y: event.clientY };
            event.stopPropagation();
        }
    }

    onMouseMove(event) {
        if (this.isDragging) {
            this.dragEdge(event);
        } else if (this.draggingHandle) {
            this.dragHandle(event);
        }
    }

    dragEdge(event) {
        const dx = event.clientX - this.dragStart.x;
        const dy = event.clientY - this.dragStart.y;

        const newX1 = parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[0]) + dx;
        const newY1 = parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[1]) + dy;
        const newX2 = parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]) + dx;
        const newY2 = parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]) + dy;

        this.setStandalonePosition(newX1, newY1, newX2, newY2);
        this.dragStart = { x: event.clientX, y: event.clientY };
    }

    dragHandle(event) {
        const newX = event.clientX;
        const newY = event.clientY;

        if (this.draggingHandle === this.handle1) {
            console.log("поинтс", newX, newY, parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]), parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]))
            this.setStandalonePosition(newX, newY,
                parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]),
                parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]));
            this.updatePosition()
            console.log("handle1")
        } else if (this.draggingHandle === this.handle2) {
            this.setStandalonePosition(
                parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[0]),
                parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[1]),
                newX, newY);
            this.updatePosition()
            console.log("handle2")
        }
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
        }

        this.handleConnectionPoints();
        this.draggingHandle = null;
        this.updateHandles();
    }

    handleConnectionPoints() {
        const freeEndX = this.draggingHandle === this.handle1
            ? parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[0])
            : parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]);
        const freeEndY = this.draggingHandle === this.handle1
            ? parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[1])
            : parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]);

        let foundEntity = false;
        let closestPoint = null;
        let closestDistance = Infinity;

        for (let entity of this.graph.cells) {
            const { x, y } = entity.geometry;
            entity.setConnectionPoints();
            for (let point of entity.connectionPoints) {
                const distance = this.calculateDistance(point, freeEndX, freeEndY);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPoint = point;
                }
                if (entity.isPointInEntity(freeEndX, freeEndY)) {
                    foundEntity = true;
                    this.bindToEntity(freeEndX, freeEndY, closestPoint, entity);
                }
            }
        }

        if (!this.entity1 && !this.entity2) {
            this.isStandalone = true;
        } else {
            this.isStandalone = false;
        }
    }

    calculateDistance(point, x, y) {
        return Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
    }

    bindToEntity(freeEndX, freeEndY, closestPoint, entity) {
        if (this.draggingHandle === this.handle1) {
            this.entity1 = entity;
            this.setStandalonePosition(closestPoint.x, closestPoint.y,
                parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]),
                parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]));
        } else if (this.draggingHandle === this.handle2) {
            this.entity2 = entity;
            this.setStandalonePosition(
                parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[0]),
                parseFloat(this.element.getAttribute('points').split(' ')[0].split(',')[1]),
                closestPoint.x, closestPoint.y);
        }
    }

    initEvents() {
        this.element.addEventListener('click', (event) => {
            this.graph.selectEdge(this);
            event.stopPropagation();
        });
    }

    updateAppearance() {
        this.element.setAttribute('stroke', this.selected ? 'yellow' : 'black');
        this.element.setAttribute('stroke-width', this.selected ? '2' : '1');
    }

    select() {
        this.selected = true;
        this.updateAppearance();
    }

    deselect() {
        this.selected = false;
        this.updateAppearance();
    }

    updatePosition() {
        if (this.isStandalone) return;

        if (this.entity1 && this.entity2) {
            this.updateBothEnds();
        } else if (this.entity1) {
            this.updateStart();
        } else if (this.entity2) {
            this.updateEnd();
        }

        this.updateHandles();
        this.updateAppearance();
    }

    updateBothEnds() {
        console.log("updateBoth")
        const { start, end } = this.entity1.findClosestConnectionPoints(this.entity2);

        if (start && end) {
            this.setStandalonePosition(start.x, start.y, end.x, end.y);
        }
    }

    updateStart() {
        console.log("updateStart")
        const pointsString = this.element.getAttribute('points');

        const pointsArray = pointsString.split(' ').map(point => {
            const [x, y] = point.split(',');
            return { x: parseFloat(x), y: parseFloat(y) };
        });

        const lastPoint = pointsArray[pointsArray.length - 1];
        console.log("lastPoint", lastPoint)

        const { start } = this.entity1.findClosestConnectionPoints({
            geometry: {
                x: lastPoint.x,
                y: lastPoint.y,
                width: 0,
                height: 0
            },
            setConnectionPoints: function () {
                this.connectionPoints = [{ x: lastPoint.x, y: lastPoint.y }];
            }
        });
        console.log("start in updateStart", start)

        this.setStandalonePosition(start.x, start.y,
            lastPoint.x,
            lastPoint.y);
    }

    updateEnd() {
        console.log("updateEnd")
        const pointsString = this.element.getAttribute('points');
        console.log("pointsString", pointsString);
        console.log("entity2 connectionPoints", this.entity2.connectionPoints);

        const pointsArray = pointsString.split(' ').map(point => {
            const [x, y] = point.split(',');
            return { x: parseFloat(x), y: parseFloat(y) };
        });

        const firstPoint = pointsArray[0];
        console.log("firstPoint", firstPoint);

        let closestPoint = null;
        let minDistance = Infinity;

        this.entity2.setConnectionPoints()
        for (const point2 of this.entity2.connectionPoints) {
            const distance = this.entity2.calculateDistance(firstPoint, point2);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point2;
            }
        }

        console.log("Closest point on entity2:", closestPoint);

        this.setStandalonePosition(
            firstPoint.x,
            firstPoint.y,
            closestPoint.x, closestPoint.y
        );
    }
}

const svgContainer = document.getElementById('svgContainer');
const graphHandler = new GraphHandler(svgContainer);

let identifiers = [];
let attributes = [];

document.getElementById('addEntityButton').addEventListener('click', () => {
    graphHandler.selectionModel.deselect();
    deleteEntityButton.style.display = 'none';

    const entityOptions = document.getElementById('entityOptions');
    entityOptions.style.display = entityOptions.style.display === 'none' ? 'block' : 'none';
    identifiers = [];
    attributes = [];
    updateIdentifiersList();
    updateAttributesList();
    resetEntityForm();
});

// Добавить идентификатор
document.getElementById('addIdentifierButton').addEventListener('click', () => {
    const identifierInput = document.getElementById('identifierInput');
    const identifier = identifierInput.value.trim();
    if (identifier) {
        identifiers.push(identifier);
        identifierInput.value = '';
        updateIdentifiersList();

    }
});

// Добавить атрибут
document.getElementById('addAttributeButton').addEventListener('click', () => {
    const attributeInput = document.getElementById('attributeInput');
    const attribute = attributeInput.value.trim();
    if (attribute) {
        attributes.push(attribute);
        attributeInput.value = '';
        updateAttributesList();
    }
});


document.getElementById('downloadButton').addEventListener('click', () => {
    graphHandler.saveGraphState();
});
document.getElementById('uploadButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // const graphHandler = new GraphHandler(document.getElementById('svgContainer')); // Adjust container
        graphHandler.loadState(file);
    }
});

// Обновить отображение идентификаторов
function updateIdentifiersList() {
    const identifiersList = document.getElementById('identifiersList');
    identifiersList.innerHTML = '';
    identifiers.forEach(identifier => {
        const item = document.createElement('div');
        item.textContent = identifier;
        identifiersList.appendChild(item);
    });
}

// Обновить отображение атрибутов
function updateAttributesList() {
    const attributesList = document.getElementById('attributesList');
    attributesList.innerHTML = '';
    attributes.forEach(attribute => {
        const item = document.createElement('div');
        item.textContent = attribute;
        attributesList.appendChild(item);
    });
}

// Создать сущность 
document.getElementById('createEntityButton').addEventListener('click', () => {
    const selectedType = document.querySelector('input[name="entityType"]:checked').value;
    const entityName = document.getElementById('entityNameInput').value || 'New Entity';

    let isStrong = false;
    const isRelational = document.getElementById('relationalEntityCheckbox').checked;

    if (selectedType === 'strong') {
        isStrong = true;
    } 

    const centerX = svgContainer.clientWidth / 2;
    const centerY = svgContainer.clientHeight / 2;
    const newEntity = new Entity(graphHandler, entityName, centerX - 60, centerY - 30, 120, 60, isStrong, isRelational);

    identifiers.forEach(id => newEntity.addElement(id, true));
    attributes.forEach(attr => newEntity.addElement(attr, false));

    graphHandler.addEntity(newEntity);

    document.getElementById('entityOptions').style.display = 'none';
    identifiers = [];
    attributes = [];
    updateIdentifiersList();
    updateAttributesList();
    console.log('Entity created:', newEntity);

});


let selectedEntity = null;

// Отобразить данные выбранной сущности на панели
function displaySelectedEntityData(entity) {
    selectedEntity = entity;
    const selectedEntityData = document.getElementById('selectedEntityData');

    selectedEntityData.style.display = 'block';

    const entityNameInput = document.getElementById('selectedEntityNameInput');
    entityNameInput.value = entity.label;
    entityNameInput.addEventListener('input', (event) => {
        selectedEntity.label = event.target.value;
        selectedEntity.updateTextPosition();
    });

    const selectedIdentifiersList = document.getElementById('selectedIdentifiersList');
    const selectedAttributesList = document.getElementById('selectedAttributesList');

    selectedIdentifiersList.innerHTML = '';
    selectedAttributesList.innerHTML = '';

    entity.attributes.forEach((attr, index) => {
        const item = createEditableItemWithControls(
            attr,
            (newName) => {
                entity.attributes[index].name = newName;
                entity.updateAttributesOnCanvas();
            },
            () => {
                entity.attributes.splice(index, 1);
                entity.updateAttributesOnCanvas();
                displaySelectedEntityData(entity);
            },
            (updatedAttr) => {
                entity.attributes[index] = { ...entity.attributes[index], ...updatedAttr };
                entity.updateAttributesOnCanvas();
            },
            entity.isRelational
        );

        if (attr.isIdentifier) {
            selectedIdentifiersList.appendChild(item);
        } else {
            selectedAttributesList.appendChild(item);
        }
    });
}


function createEditableItemWithControls(attr, onSave, onDelete, onUpdate, isRelational) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.marginBottom = '10px';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = attr.name;
    input.style.width = 'calc(100% - 20px)';
    input.style.boxSizing = 'border-box';
    input.addEventListener('input', () => onSave(input.value));

    container.appendChild(input);

    // Кнопка "Удалить"
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.position = 'absolute';
    deleteButton.style.bottom = '0';
    deleteButton.style.right = '0';
    deleteButton.style.backgroundColor = '#ff6b6b';
    deleteButton.style.color = 'white';
    deleteButton.style.border = 'none';
    deleteButton.style.padding = '5px 10px';
    deleteButton.style.borderRadius = '5px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.display = 'none';
    deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onDelete();
    });

    input.addEventListener('focus', () => {
        deleteButton.style.display = 'block';
    });

    input.addEventListener('blur', () => {
        setTimeout(() => {
            deleteButton.style.display = 'none';
        }, 200);
    });


    if (isRelational) {
        // Контейнер для параметров
        const controls = document.createElement('div');
        controls.style.marginTop = '5px';

        // Чекбокс для NULL
        const nullCheckbox = document.createElement('input');
        nullCheckbox.type = 'checkbox';
        nullCheckbox.checked = attr.isNull || false;
        nullCheckbox.addEventListener('change', () => onUpdate({ isNull: nullCheckbox.checked }));

        const nullLabel = document.createElement('label');
        nullLabel.textContent = 'NULL';
        nullLabel.style.marginRight = '10px';
        nullLabel.appendChild(nullCheckbox);

        // Чекбокс для Foreign Key
        const fkCheckbox = document.createElement('input');
        fkCheckbox.type = 'checkbox';
        fkCheckbox.checked = attr.isForeignKey || false;
        fkCheckbox.addEventListener('change', () => onUpdate({ isForeignKey: fkCheckbox.checked }));

        const fkLabel = document.createElement('label');
        fkLabel.textContent = 'FK';
        fkLabel.style.marginRight = '10px';
        fkLabel.appendChild(fkCheckbox);

        // Выпадающий список для выбора типа
        const typeSelect = document.createElement('select');
        ['int', 'nvarchar', 'money'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.toUpperCase();
            option.selected = attr.type === type;
            typeSelect.appendChild(option);
        });

        typeSelect.addEventListener('change', () => {
            onUpdate({ type: typeSelect.value });
            lengthInputContainer.style.display = ['int', 'nvarchar'].includes(typeSelect.value) ? 'block' : 'none';
        });

        // Поле ввода длины
        const lengthInputContainer = document.createElement('div');
        lengthInputContainer.style.display = ['int', 'nvarchar'].includes(attr.type) ? 'block' : 'none';
        const lengthInputLabel = document.createElement('label');
        lengthInputLabel.textContent = 'Length: ';

        const lengthInput = document.createElement('input');
        lengthInput.type = 'number';
        lengthInput.value = attr.length || '';
        lengthInput.style.width = '50px';
        lengthInput.addEventListener('input', () => onUpdate({ length: parseInt(lengthInput.value, 10) || null }));

        lengthInputLabel.appendChild(lengthInput);
        lengthInputContainer.appendChild(lengthInputLabel);

        // Добавляем элементы управления в контейнер
        controls.appendChild(nullLabel);
        controls.appendChild(fkLabel);
        controls.appendChild(typeSelect);
        controls.appendChild(lengthInputContainer);
        container.appendChild(controls);
    }

    container.appendChild(deleteButton);

    return container;
}


function createEditableItem(value, onSave) {
    const container = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;

    input.addEventListener('input', () => {
        onSave(input.value);
    });

    container.appendChild(input);
    return container;
}


// Добавление новых идентификаторов и атрибутов из панели
document.getElementById('addNewIdentifierButton').addEventListener('click', () => {
    const newIdentifierInput = document.getElementById('newIdentifierInput');
    const newIdentifier = newIdentifierInput.value.trim();

    if (newIdentifier && selectedEntity) {
        selectedEntity.addElement(newIdentifier, true);

        selectedEntity.updateAttributesOnCanvas();

        displaySelectedEntityData(selectedEntity);
        newIdentifierInput.value = '';
    }
});

document.getElementById('addNewAttributeButton').addEventListener('click', () => {
    const newAttributeInput = document.getElementById('newAttributeInput');
    const newAttribute = newAttributeInput.value.trim();

    if (newAttribute && selectedEntity) {
        selectedEntity.addElement(newAttribute, false);
       
        selectedEntity.updateAttributesOnCanvas();

        displaySelectedEntityData(selectedEntity);
        newAttributeInput.value = '';
    }
});



document.getElementById('selectedEntityNameInput').addEventListener('input', (event) => {
    if (selectedEntity) {
        selectedEntity.label = event.target.value;
        selectedEntity.updateTextPosition();
    }
});


function resetEntityForm() {
    document.getElementById('identifiersList').innerHTML = '';
    document.getElementById('attributesList').innerHTML = '';
    document.getElementById('identifierInput').value = '';
    document.getElementById('attributeInput').value = '';
    document.getElementById('entityNameInput').value = '';
}

// Очистка панели
function clearSelectedEntityData() {
    selectedEntity = null;
    document.getElementById('selectedEntityData').style.display = 'none';
    document.getElementById('selectedIdentifiersList').innerHTML = '';
    document.getElementById('selectedAttributesList').innerHTML = '';
}

// Добавить связь
document.getElementById('addEdgeButton').addEventListener('click', () => {
    const handlesOptions = document.getElementById('handlesOptions');
    handlesOptions.style.display = handlesOptions.style.display === 'none' ? 'block' : 'none';
    
    document.getElementById('createEdgeButton').style.display = 'block';

    graphHandler.selectionModel.deselect();
    deleteEntityButton.style.display = 'none';
});

document.getElementById('createEdgeButton').addEventListener('click', () => {
    graphHandler.selectionModel.deselect();
    
    const handle1Type = document.getElementById('handle1TypeSelect').value;
    const handle2Type = document.getElementById('handle2TypeSelect').value;

    const svgWidth = svgContainer.clientWidth;
    const svgHeight = svgContainer.clientHeight;

    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    const offset = 50;

    const startX = centerX - offset;
    const startY = centerY;
    const endX = centerX + offset;
    const endY = centerY;

    graphHandler.addEdgeStandalone(startX, startY, endX, endY, handle1Type, handle2Type);

    document.getElementById('handlesOptions').style.display = 'none';
    document.getElementById('createEdgeButton').style.display = 'none';
});

function updateRelationalAttribute(attr, newParams) {
    Object.assign(attr, newParams); 
    selectedEntity.updateAttributesOnCanvas(); 
}

document.getElementById('relationalEntityCheckbox').addEventListener('change', (event) => {
    if (selectedEntity) {
        selectedEntity.isRelational = event.target.checked;
        document.getElementById('relationalAttributes').style.display = event.target.checked ? 'block' : 'none';
        selectedEntity.updateAttributesOnCanvas();
    }
});

document.getElementById('selectedAttributesList').addEventListener('click', (event) => {
    const relationalAttributesPanel = document.getElementById('relationalAttributes');
    relationalAttributesPanel.style.display = selectedEntity.isRelational ? 'block' : 'none';

    // Заполняем данные для редактирования
    if (event.target.tagName === 'INPUT') {
        const selectedAttr = selectedEntity.attributes.find(attr => attr.name === event.target.value);
        if (selectedAttr) {
            document.getElementById('isNull').checked = selectedAttr.isNull || false;
            document.getElementById('isForeignKey').checked = selectedAttr.isForeignKey || false;
            document.getElementById('attributeTypeSelect').value = selectedAttr.type || '';
            document.getElementById('attributeLength').value = selectedAttr.length || '';
        }
    }
});


document.getElementById('attributeTypeSelect').addEventListener('change', (event) => {
    const newType = event.target.value;
    updateRelationalAttribute(selectedAttribute, { type: newType });
    selectedEntity.updateAttributesOnCanvas();
});

document.getElementById('isNull').addEventListener('change', (event) => {
    const isNullChecked = event.target.checked;
    updateRelationalAttribute(selectedAttribute, { isNull: isNullChecked });
    selectedEntity.updateAttributesOnCanvas();
});

document.getElementById('attributeLength').addEventListener('input', (event) => {
    const lengthValue = parseInt(event.target.value, 10);
    updateRelationalAttribute(selectedAttribute, { length: lengthValue });
    selectedEntity.updateAttributesOnCanvas();
});

document.getElementById('isForeignKey').addEventListener('change', (event) => {
    const isForeignKeyChecked = event.target.checked;
    updateRelationalAttribute(selectedAttribute, { isForeignKey: isForeignKeyChecked });
    selectedEntity.updateAttributesOnCanvas();
});


const deleteEntityButton = document.getElementById('deleteEntityButton');

deleteEntityButton.addEventListener('click', () => {
    if (selectedEntity) {
        graphHandler.deleteEntity(selectedEntity);
        clearSelectedEntityData();
        deleteEntityButton.style.display = 'none';
    }
});


//////////////// пример работы /////////////////
/*
//const svgContainer = document.getElementById('svgContainer');
//const graphHandler = new GraphHandler(svgContainer);

const entity1 = new Entity(graphHandler, 'Entity1', 400, 30, 50, 50, false, true);
const entity2 = new Entity(graphHandler, 'Entity2', 250, 30, 50, 50);

graphHandler.addEntity(entity1);
graphHandler.addEntity(entity2);

document.getElementById('addEntityButton').addEventListener('click', () => {
   
    const svgWidth = svgContainer.clientWidth;
    const svgHeight = svgContainer.clientHeight;

    const randomX = Math.floor(Math.random() * (svgWidth - 50)); 
    const randomY = Math.floor(Math.random() * (svgHeight - 50)); 

    const newEntity = new Entity(graphHandler, `Entity${graphHandler.cells.length + 1}`, randomX, randomY, 50, 50);
    graphHandler.addEntity(newEntity);
});
document.getElementById('addEdgeButton').addEventListener('click', () => {
    const svgWidth = svgContainer.clientWidth;
    const svgHeight = svgContainer.clientHeight;

    const randomX1 = Math.floor(Math.random() * svgWidth);
    const randomY1 = Math.floor(Math.random() * svgHeight);
    const randomX2 = Math.floor(Math.random() * svgWidth);
    const randomY2 = Math.floor(Math.random() * svgHeight);

    graphHandler.addEdgeStandalone(randomX1, randomY1, randomX2, randomY2);
});

*/