class Entity {
    constructor(graph, name, x, y, width, height, isStrong, isRelational) {
        this.graph = graph;
        this.geometry = { x, y, width, height };
        this.label = name || 'New Entity';
        this.isStrong = isStrong; 
        this.isRelational = isRelational;
        this.initialFillColor = this.isRelational ? '#ffffff' : (this.isStrong ? '#77dd77' : '#ffc26c');

        this.element = this.createEntityElement();
        this.attributes = [];
        this.selected = false;
        this.resizeHandle = this.createResizeHandle();

        this.element.appendChild(this.resizeHandle);
        this.initEvents();
        this.connectionPoints = [];
        this.setConnectionPoints();
        this.hasPrimaryAttribute = false;
        this.separator = null;
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
            'stroke-width': '2' 
        });
    
        this.text = this.createSVGElement('text', { 
            x: this.geometry.width / 2, 
            y: -5,
            'dominant-baseline': 'middle', 
            'text-anchor': 'middle', 
            fill: 'black', 
            'font-size': '14',
            'font-family': 'Georgia, serif', 
            'font-weight': 'bold'
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
        console.log("Attributes of entity:", this.attributes);
        event.stopPropagation();
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
    
            const keyIcon = text && text.nextElementSibling?.tagName === 'image' ? text.nextElementSibling : null;
            if (keyIcon) {
                keyIcon.setAttribute('y', newYPos + (heightPerAttribute - keyIcon.getAttribute('height')) / 2);
            }
        });
    
        this.resizeHandle.setAttribute('y', totalHeight - 10);
        this.updateSeparator();
    }
    
    stopResizing() {
        this.graph.isResizing = false;
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.stopResizing.bind(this));
    }

    updateTextPosition() {
        this.text.textContent = this.label;
        this.text.setAttribute('x', 0); 
        this.text.setAttribute('y', -15); 
        this.text.setAttribute('text-anchor', 'start'); 
        this.text.setAttribute('dominant-baseline', 'hanging');
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
    
    updateSeparator() {
        if (this.separator) {
            this.element.removeChild(this.separator);
        }

        if (this.identifierGroup.children.length > 0 && this.attributeGroup.children.length > 0) {
            console.log('Number of identifiers:', this.identifierGroup.children.length);
            console.log('Number of attributes:', this.attributeGroup.children.length);
            const lastIdentifier = Array.from(this.identifierGroup.children).reverse().find(child => child.tagName === 'rect' && child.classList.contains('table-cell'));
        const firstAttribute = Array.from(this.attributeGroup.children).find(child => child.tagName === 'rect' && child.classList.contains('table-cell'));
            console.log('Last Identifier outerHTML:', lastIdentifier.outerHTML);
            console.log('First Attribute outerHTML:', firstAttribute.outerHTML);
            
            const separatorY = parseFloat(lastIdentifier.getAttribute('y')) + parseFloat(lastIdentifier.getAttribute('height'));

            this.separator = this.createSVGElement('line', {
                x1: 0,
                y1: separatorY,
                x2: this.geometry.width,
                y2: separatorY,
                stroke: 'black',
                'stroke-width': '1'
            });

            this.element.appendChild(this.separator);
        }
    }

    updateAttributesOnCanvas() {
        this.identifierGroup.innerHTML = '';
        this.attributeGroup.innerHTML = '';
    
        const heightPerAttribute = this.geometry.height / (this.attributes.length || 1);
        const isStrong = this.isStrong;
    
        this.attributes.forEach((attr, index) => {
            const yPos = heightPerAttribute * index;
    
            let fillColor = this.initialFillColor; 
    
            if (attr.isIdentifier) {
                if (this.isRelational) {
                    fillColor = '#B5B5B5'; 
                } else if (isStrong) {
                    fillColor = '#228B22'; 
                } else {
                    fillColor = '#E9A039'; 
                }
            }
    
            const attributeRect = this.createSVGElement('rect', {
                class: 'table-cell',
                width: this.geometry.width,
                height: heightPerAttribute,
                y: yPos,
                fill: fillColor,
                stroke: 'none',
            });
    
            let attributeText;
            if (this.isRelational) {
                attributeText = `${attr.name}: ${attr.type}`;
                if (['int', 'nvarchar'].includes(attr.type) && attr.length) {
                    attributeText += `(${attr.length})`;
                }
                attributeText += attr.isNull ? ' NULL' : ' NOT NULL';
                if (attr.isForeignKey) {
                    attributeText += ' (FK)';
                }
                if (attr.isIdentifier) {
                    attributeText += ' (PK)';
                }
            } else {
                attributeText = attr.name;
            }
    
            const textAttributes = attr.isIdentifier
                ? { 'font-size': '18', 'font-weight': 'bold' } 
                : { 'font-size': '16', 'font-weight': 'normal' }; 
    
            const text = this.createSVGElement('text', {
                x: attr.isIdentifier ? '50' : '5', 
                y: yPos + heightPerAttribute / 2,
                fill: 'black',
                'font-family': 'Georgia, serif', 
                'text-anchor': 'start',
                'alignment-baseline': 'middle', 
                ...textAttributes, 
            });
            text.textContent = attributeText;
    
            if (attr.isIdentifier) {
                this.identifierGroup.appendChild(attributeRect);
                this.identifierGroup.appendChild(text);
                if (this.isRelational) {
                    const keyIcon = this.createSVGElement('image', {
                        href: './resrcs/key.png',
                        x: 5, 
                        y: yPos + (heightPerAttribute - 12 * 2) / 2, 
                        width: 12 * 3,
                        height: 12 * 3,
                    });
                    this.identifierGroup.appendChild(keyIcon); 
                }
            } else {
                this.attributeGroup.appendChild(attributeRect);
                this.attributeGroup.appendChild(text);
            }
        });
    
        this.geometry.height = heightPerAttribute * this.attributes.length;
        this.rect.setAttribute('height', this.geometry.height);
        this.updateResizeHandlePosition();
        this.updateAttributePositions();
        this.updateSeparator();
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
        attributes: entity.attributes.filter(attr => !attr.isIdentifier).map(attr => attr.name), 
        identifiers: entity.attributes.filter(attr => attr.isIdentifier).map(attr => attr.name) 
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
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('stroke', 'black');
        polyline.setAttribute('stroke-width', '1');
        polyline.setAttribute('fill', 'none');
        return polyline;
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
            console.log("end",end)
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
            console.log("поинтс", newX,newY,parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[0]), parseFloat(this.element.getAttribute('points').split(' ')[3].split(',')[1]))
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
        console.log("lastPoint",lastPoint)
    
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
        console.log("start in updateStart",start)
    
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


document.getElementById('saveGraphButton').addEventListener('click', () => {
    graphHandler.saveGraphState();  // Сохраняем граф в файл
});
document.getElementById('loadGraphButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // const graphHandler = new GraphHandler(document.getElementById('svgContainer')); // Adjust container
        graphHandler.loadState(file);
    }
});

function updateIdentifiersList() {
    const identifiersList = document.getElementById('identifiersList');
    identifiersList.innerHTML = '';
    identifiers.forEach(identifier => {
        const item = document.createElement('div');
        item.textContent = identifier;
        identifiersList.appendChild(item);
    });
}

function updateAttributesList() {
    const attributesList = document.getElementById('attributesList');
    attributesList.innerHTML = '';
    attributes.forEach(attribute => {
        const item = document.createElement('div');
        item.textContent = attribute;
        attributesList.appendChild(item);
    });
}

document.getElementById('createEntityButton').addEventListener('click', () => {
    const selectedType = document.querySelector('input[name="entityType"]:checked').value;
    const isStrong = selectedType === 'strong';
    const isRelational = document.getElementById('isRelationalCheckbox').checked;
    const entityName = document.getElementById('entityNameInput').value || 'New Entity';

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
});
document.getElementById('attributeTypeSelect').addEventListener('change', (event) => {
    const lengthInputContainer = document.getElementById('lengthInputContainer');
    const selectedType = event.target.value;
    
    if (selectedType === 'int' || selectedType === 'nvarchar') {
        lengthInputContainer.style.display = 'block';
    } else {
        lengthInputContainer.style.display = 'none';
    }
});


let selectedEntity = null;

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
    selectedIdentifiersList.innerHTML = '<h5>Identifiers</h5>';
    selectedAttributesList.innerHTML = '<h5>Attributes</h5>';

    const relationalAttributes = document.getElementById('relationalAttributes');
    if (entity.isRelational) {
        relationalAttributes.style.display = 'block';
    } else {
        relationalAttributes.style.display = 'none';
    }

    entity.attributes.forEach((attr, index) => {
        if (attr.isIdentifier) {
            const item = createEditableItem(attr, (updatedAttr) => {
                entity.attributes[index] = updatedAttr;
                entity.updateAttributesOnCanvas();
            }, entity); 
            selectedIdentifiersList.appendChild(item);
        }
    });

    entity.attributes.forEach((attr, index) => {
        if (!attr.isIdentifier) {
            const item = createEditableItem(attr, (updatedAttr) => {
                entity.attributes[index] = updatedAttr;
                entity.updateAttributesOnCanvas();
            }, entity);  
            selectedAttributesList.appendChild(item);
        }
    });
}

function createEditableItem(attr, onSave, entity) {
    const container = document.createElement('div');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = attr.name;
    container.appendChild(input);

    if (entity.isRelational) {
        const isNullCheckbox = document.createElement('input');
        isNullCheckbox.type = 'checkbox';
        isNullCheckbox.checked = attr.isNull;
        isNullCheckbox.addEventListener('change', () => {
            attr.isNull = isNullCheckbox.checked;
            onSave(attr);
        });
        container.appendChild(document.createTextNode(' Is Null '));
        container.appendChild(isNullCheckbox);

        const isForeignKeyCheckbox = document.createElement('input');
        isForeignKeyCheckbox.type = 'checkbox';
        isForeignKeyCheckbox.checked = attr.isForeignKey;
        isForeignKeyCheckbox.addEventListener('change', () => {
            attr.isForeignKey = isForeignKeyCheckbox.checked;
            onSave(attr);
        });
        container.appendChild(document.createTextNode(' Foreign Key '));
        container.appendChild(isForeignKeyCheckbox);

        const typeSelect = document.createElement('select');
        const typeOptions = ['int', 'nvarchar', 'money'];
        typeOptions.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.toUpperCase();
            if (attr.type === type) {
                option.selected = true;
            }
            typeSelect.appendChild(option);
        });
        typeSelect.addEventListener('change', () => {
            attr.type = typeSelect.value;
            onSave(attr);
            updateLengthInputVisibility(attr.type);
        });
        container.appendChild(document.createTextNode(' Type: '));
        container.appendChild(typeSelect);

        const lengthInputContainer = document.createElement('div');
        lengthInputContainer.id = 'lengthInputContainer';
        lengthInputContainer.style.display = (attr.type === 'int' || attr.type === 'nvarchar') ? 'block' : 'none';

        const lengthLabel = document.createElement('label');
        lengthLabel.setAttribute('for', 'attributeLength');
        lengthLabel.textContent = 'Length:';
        lengthInputContainer.appendChild(lengthLabel);

        const lengthInput = document.createElement('input');
        lengthInput.type = 'number';
        lengthInput.id = 'attributeLength';
        lengthInput.placeholder = 'Length (for int, nvarchar)';
        lengthInput.value = attr.length || '';
        lengthInput.addEventListener('input', () => {
            attr.length = lengthInput.value;
            onSave(attr);
        });
        lengthInputContainer.appendChild(lengthInput);

        container.appendChild(lengthInputContainer);
    }

    input.addEventListener('input', () => {
        attr.name = input.value;
        onSave(attr);
    });

    return container;
}

function updateLengthInputVisibility(type) {
    const lengthInputContainer = document.getElementById('lengthInputContainer');
    if (lengthInputContainer) {
        lengthInputContainer.style.display = (type === 'int' || type === 'nvarchar') ? 'block' : 'none';
    }
}

document.getElementById('addNewIdentifierButton').addEventListener('click', () => {
    const newIdentifierInput = document.getElementById('newIdentifierInput');
    const newIdentifier = newIdentifierInput.value.trim();
    if (newIdentifier && selectedEntity) {
        selectedEntity.addElement(newIdentifier, true);
        displaySelectedEntityData(selectedEntity);
        newIdentifierInput.value = '';
    }
});

document.getElementById('addNewAttributeButton').addEventListener('click', () => {
    const newAttributeInput = document.getElementById('newAttributeInput');
    const newAttributeName = newAttributeInput.value.trim();
    
    const isNull = document.getElementById('isNull').checked; 
    const isForeignKey = document.getElementById('isForeignKey').checked;
    const attributeType = document.getElementById('attributeTypeSelect').value;  
    const length = document.getElementById('attributeLength').value.trim(); 

    if (newAttributeName && selectedEntity) {
        selectedEntity.addElement(newAttributeName, false, isNull, isForeignKey, attributeType, length);
        
        displaySelectedEntityData(selectedEntity); 
        
        newAttributeInput.value = ''; 
        document.getElementById('attributeLength').value = '';  
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

function clearSelectedEntityData() {
    selectedEntity = null;
    document.getElementById('selectedEntityData').style.display = 'none';
    document.getElementById('selectedIdentifiersList').innerHTML = '';
    document.getElementById('selectedAttributesList').innerHTML = '';
}

document.getElementById('addEdgeButton').addEventListener('click', () => {
    const svgWidth = svgContainer.clientWidth;
    const svgHeight = svgContainer.clientHeight;

    const randomX1 = Math.floor(Math.random() * svgWidth);
    const randomY1 = Math.floor(Math.random() * svgHeight);
    const randomX2 = Math.floor(Math.random() * svgWidth);
    const randomY2 = Math.floor(Math.random() * svgHeight);

    graphHandler.addEdgeStandalone(randomX1, randomY1, randomX2, randomY2);
});



//////////////// пример работы /////////////////
/*const svgContainer = document.getElementById('svgContainer');
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

*/