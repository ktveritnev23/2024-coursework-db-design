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
            y: 15, 
            'dominant-baseline': 'middle', 
            'text-anchor': 'middle', 
            fill: 'black', 
            'font-size': '14' 
        });
        this.text.textContent = this.label;

        entityGroup.appendChild(this.rect);
        entityGroup.appendChild(this.text);
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
        this.text.setAttribute('y', 15);
    }

    showAddAttributePrompt() {
        const attributeName = prompt("Enter attribute name:");
        if (attributeName) {
            this.addElement(attributeName);
        }
    }

    addElement(name) {
        this.attributes.push(name);
        const yPos = this.geometry.height;
    
        const attributeRect = this.createSVGElement('rect', {
            class: 'table-cell',
            width: this.geometry.width,
            height: '30',
            y: yPos,
            fill: 'lightgreen',
            stroke: 'black',
            'stroke-width': '1'
        });
        this.element.appendChild(attributeRect);
    
        const text = this.createSVGElement('text', {
            x: '5', 
            y: yPos + 20, 
            fill: 'black',
            'font-size': '12', 
            'text-anchor': 'start' 
        });
        text.textContent = name; 
        this.element.appendChild(text);
    
        this.geometry.height += 30;
        this.rect.setAttribute('height', this.geometry.height);
        this.updateResizeHandlePosition();
        this.element.appendChild(this.resizeHandle);
        this.updateLastAttributePosition();
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
    }

    addEdge(entity1, entity2) {
        const edge = new Edge(this, entity1, entity2);
        this.edges.push(edge);
        edge.updatePosition();
    }

    addEdgeStandalone(x1, y1, x2, y2) {
        const edge = new Edge(this, null, null, true);
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
        this.selectedEntity.showButton();
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
    }

    clearEntitySelection(entity) {
        entity.rect.setAttribute('fill', 'lightblue');
        entity.hideButton();
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
        entity.rect.setAttribute('fill', 'yellow');
        entity.showButton();
    }

    deselect() {
        if (this.selectedElement) {
            this.clearSelection(this.selectedElement);
            this.selectedElement = null;
        }
    }
}


class Edge {
    constructor(graph, entity1 = null, entity2 = null, isStandalone = false) {
        this.graph = graph;
        this.entity1 = entity1;
        this.entity2 = entity2;
        this.isStandalone = isStandalone;
        this.selected = false;
        this.isDragging = false;
        this.draggingHandle = null;
        this.dragStart = { x: 0, y: 0 };

        this.element = this.createEdgeElement();
        this.handle1 = this.createHandle();
        this.handle2 = this.createHandle();

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
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', '1');
        return line;
    }

    createHandle() {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('r', 5);
        handle.setAttribute('fill', 'red');
        handle.setAttribute('stroke', 'black');
        handle.setAttribute('stroke-width', '1');
        return handle;
    }

    setStandalonePosition(x1, y1, x2, y2) {
        this.element.setAttribute('x1', x1);
        this.element.setAttribute('y1', y1);
        this.element.setAttribute('x2', x2);
        this.element.setAttribute('y2', y2);
        this.updateHandles();
        this.updateAppearance();
    }

    updateHandles() {
        const x1 = parseFloat(this.element.getAttribute('x1'));
        const y1 = parseFloat(this.element.getAttribute('y1'));
        const x2 = parseFloat(this.element.getAttribute('x2'));
        const y2 = parseFloat(this.element.getAttribute('y2'));

        this.handle1.setAttribute('cx', x1);
        this.handle1.setAttribute('cy', y1);
        this.handle2.setAttribute('cx', x2);
        this.handle2.setAttribute('cy', y2);
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

        const newX1 = parseFloat(this.element.getAttribute('x1')) + dx;
        const newY1 = parseFloat(this.element.getAttribute('y1')) + dy;
        const newX2 = parseFloat(this.element.getAttribute('x2')) + dx;
        const newY2 = parseFloat(this.element.getAttribute('y2')) + dy;

        this.setStandalonePosition(newX1, newY1, newX2, newY2);
        this.dragStart = { x: event.clientX, y: event.clientY };
    }

    dragHandle(event) {
        const newX = event.clientX;
        const newY = event.clientY;

        if (this.draggingHandle === this.handle1) {
            this.setStandalonePosition(newX, newY,
                parseFloat(this.element.getAttribute('x2')),
                parseFloat(this.element.getAttribute('y2')));
        } else if (this.draggingHandle === this.handle2) {
            this.setStandalonePosition(
                parseFloat(this.element.getAttribute('x1')),
                parseFloat(this.element.getAttribute('y1')),
                newX, newY);
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
            ? parseFloat(this.element.getAttribute('x1'))
            : parseFloat(this.element.getAttribute('x2'));
        const freeEndY = this.draggingHandle === this.handle1
            ? parseFloat(this.element.getAttribute('y1'))
            : parseFloat(this.element.getAttribute('y2'));

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
            this.element.setAttribute('x1', closestPoint.x);
            this.element.setAttribute('y1', closestPoint.y);
        } else if (this.draggingHandle === this.handle2) {
            this.entity2 = entity;
            this.element.setAttribute('x2', closestPoint.x);
            this.element.setAttribute('y2', closestPoint.y);
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
        const start = this.entity1.findClosestConnectionPoint(this.entity2);
        const end = this.entity2.findClosestConnectionPoint(this.entity1);
        this.setStandalonePosition(start.x, start.y, end.x, end.y);
    }

    updateStart() {
        const start = this.entity1.findClosestConnectionPoint({
            geometry: { x: this.element.getAttribute('x2'), y: this.element.getAttribute('y2'), width: 0, height: 0 }
        });
        this.setStandalonePosition(start.x, start.y,
            this.element.getAttribute('x2') || 0,
            this.element.getAttribute('y2') || 0);
    }

    updateEnd() {
        const end = this.entity2.findClosestConnectionPoint({
            geometry: { x: this.element.getAttribute('x1'), y: this.element.getAttribute('y1'), width: 0, height: 0 }
        });
        this.setStandalonePosition(
            this.element.getAttribute('x1') || 0,
            this.element.getAttribute('y1') || 0,
            end.x, end.y);
    }
}


//////////////// пример работы /////////////////
const svgContainer = document.getElementById('svgContainer');
const graphHandler = new GraphHandler(svgContainer);

const entity1 = new Entity(graphHandler, 'Entity1', 400, 30, 50, 50);
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
