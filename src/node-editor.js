// Node-Based Brush System for ARTemis
// Similar to NukeX/Nuke Studio node editing

class NodeEditor {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.nextNodeId = 1;
        
        // Canvas state
        this.canvas = {
            offsetX: 0,
            offsetY: 0,
            zoom: 1,
            isPanning: false,
            panStartX: 0,
            panStartY: 0
        };
        
        // Connection state
        this.connecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
        
        // Dragging state
        this.draggingNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.initializeUI();
        this.bindEvents();
    }
    
    initializeUI() {
        // Create the node editor window
        const editorWindow = document.createElement('div');
        editorWindow.id = 'node-editor-window';
        editorWindow.innerHTML = `
            <div class="node-editor-header">
                <h3>Node-Based Brush Editor</h3>
                <div class="node-editor-controls">
                    <button class="node-editor-btn" id="node-clear-all">Clear All</button>
                    <button class="node-editor-btn primary" id="node-save-brush">Save to Brushes</button>
                    <button class="node-editor-btn node-editor-close" id="node-editor-close">✕</button>
                </div>
            </div>
            <div class="node-editor-body">
                <div class="node-palette">
                    <div class="node-category">
                        <h4>Input Nodes</h4>
                        <button class="node-type-btn" data-node-type="color-input">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            Color Input
                        </button>
                        <button class="node-type-btn" data-node-type="value-input">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Value Input
                        </button>
                        <button class="node-type-btn" data-node-type="texture-input">
                            <span class="node-type-icon" style="background: #ae3ec9;"></span>
                            Texture Input
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Brush Properties</h4>
                        <button class="node-type-btn" data-node-type="size">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Size
                        </button>
                        <button class="node-type-btn" data-node-type="opacity">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Opacity
                        </button>
                        <button class="node-type-btn" data-node-type="hardness">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Hardness
                        </button>
                        <button class="node-type-btn" data-node-type="flow">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Flow
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Effects</h4>
                        <button class="node-type-btn" data-node-type="scatter">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Scatter
                        </button>
                        <button class="node-type-btn" data-node-type="rotation">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Rotation
                        </button>
                        <button class="node-type-btn" data-node-type="dynamics">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Dynamics
                        </button>
                        <button class="node-type-btn" data-node-type="jitter">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Jitter
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Math Nodes</h4>
                        <button class="node-type-btn" data-node-type="multiply">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Multiply
                        </button>
                        <button class="node-type-btn" data-node-type="add">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Add
                        </button>
                        <button class="node-type-btn" data-node-type="clamp">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Clamp
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Output</h4>
                        <button class="node-type-btn" data-node-type="brush-output">
                            <span class="node-type-icon" style="background: #ff8787;"></span>
                            Brush Output
                        </button>
                    </div>
                </div>
                <div class="node-canvas-container" id="node-canvas-container">
                    <svg id="node-connections-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                    </svg>
                    <div class="node-canvas" id="node-canvas">
                    </div>
                </div>
                <div class="node-properties-panel">
                    <h4>Brush Preview</h4>
                    <div class="node-info">
                        <p>Connect nodes to create a custom brush. The Brush Output node determines the final brush settings.</p>
                    </div>
                    <div class="brush-preview-container">
                        <canvas id="node-brush-preview" class="brush-preview-canvas"></canvas>
                    </div>
                    <div class="save-brush-container">
                        <label class="property-label">Brush Name</label>
                        <input type="text" id="node-brush-name" placeholder="My Custom Brush" value="Custom Brush">
                        <label class="property-label">Save Location</label>
                        <select id="node-brush-save-location">
                            <option value="custom">Custom Brushes</option>
                            <option value="favorites">Favorites</option>
                            <option value="project">Current Project</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(editorWindow);
        this.window = editorWindow;
        this.nodeCanvas = document.getElementById('node-canvas');
        this.connectionsSvg = document.getElementById('node-connections-svg');
        this.previewCanvas = document.getElementById('node-brush-preview');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Initialize preview canvas
        this.initPreviewCanvas();
        
        // Create default setup: one output node
        this.createDefaultSetup();
    }
    
    initPreviewCanvas() {
        const rect = this.previewCanvas.getBoundingClientRect();
        this.previewCanvas.width = rect.width * window.devicePixelRatio;
        this.previewCanvas.height = rect.height * window.devicePixelRatio;
        this.previewCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Draw initial preview
        this.updateBrushPreview();
    }
    
    createDefaultSetup() {
        // Create a Brush Output node in the center-right
        const outputNode = this.createNode('brush-output', 600, 200);
    }
    
    bindEvents() {
        // Close button
        document.getElementById('node-editor-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Clear all button
        document.getElementById('node-clear-all').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all nodes?')) {
                this.clearAll();
            }
        });
        
        // Save brush button
        document.getElementById('node-save-brush').addEventListener('click', () => {
            this.saveBrush();
        });
        
        // Node type buttons
        const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
        nodeTypeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nodeType = e.currentTarget.getAttribute('data-node-type');
                // Create node near center of visible area
                const x = -this.canvas.offsetX + 300;
                const y = -this.canvas.offsetY + 200;
                this.createNode(nodeType, x, y);
            });
        });
        
        // Canvas panning
        const container = document.getElementById('node-canvas-container');
        container.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.target === container)) {
                // Middle mouse or clicking on background
                this.canvas.isPanning = true;
                this.canvas.panStartX = e.clientX - this.canvas.offsetX;
                this.canvas.panStartY = e.clientY - this.canvas.offsetY;
                this.nodeCanvas.classList.add('panning');
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.canvas.isPanning) {
                this.canvas.offsetX = e.clientX - this.canvas.panStartX;
                this.canvas.offsetY = e.clientY - this.canvas.panStartY;
                this.updateCanvasTransform();
            } else if (this.draggingNode) {
                const node = this.draggingNode;
                node.x = e.clientX - this.canvas.offsetX - this.dragOffsetX;
                node.y = e.clientY - this.canvas.offsetY - this.dragOffsetY;
                this.updateNodePosition(node);
                this.updateConnections();
            } else if (this.connecting) {
                this.tempConnectionEnd = { x: e.clientX, y: e.clientY };
                this.drawTempConnection();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.canvas.isPanning) {
                this.canvas.isPanning = false;
                this.nodeCanvas.classList.remove('panning');
            }
            if (this.draggingNode) {
                this.draggingNode = null;
            }
            if (this.connecting) {
                this.connecting = false;
                this.connectionStart = null;
                this.removeTempConnection();
            }
        });
        
        // Brush preview interaction
        this.previewCanvas.addEventListener('mousedown', (e) => {
            this.isDrawingPreview = true;
            this.drawPreviewStroke(e);
        });
        
        this.previewCanvas.addEventListener('mousemove', (e) => {
            if (this.isDrawingPreview) {
                this.drawPreviewStroke(e);
            }
        });
        
        this.previewCanvas.addEventListener('mouseup', () => {
            this.isDrawingPreview = false;
        });
        
        this.previewCanvas.addEventListener('mouseleave', () => {
            this.isDrawingPreview = false;
        });
    }
    
    drawPreviewStroke(e) {
        const rect = this.previewCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);
        
        const brush = this.evaluateGraph();
        
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        this.previewCtx.beginPath();
        this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
        this.previewCtx.fill();
    }
    
    updateCanvasTransform() {
        this.nodeCanvas.style.transform = `translate(${this.canvas.offsetX}px, ${this.canvas.offsetY}px)`;
        this.updateConnections();
    }
    
    createNode(type, x, y) {
        const node = {
            id: this.nextNodeId++,
            type: type,
            x: x,
            y: y,
            inputs: [],
            outputs: [],
            parameters: {}
        };
        
        // Define node structure based on type
        this.defineNodeStructure(node);
        
        // Create DOM element
        const nodeElement = this.createNodeElement(node);
        node.element = nodeElement;
        
        this.nodes.push(node);
        this.nodeCanvas.appendChild(nodeElement);
        this.updateNodePosition(node);
        
        return node;
    }
    
    defineNodeStructure(node) {
        const definitions = {
            'color-input': {
                outputs: [{ name: 'Color', type: 'color' }],
                parameters: { color: '#000000' }
            },
            'value-input': {
                outputs: [{ name: 'Value', type: 'number' }],
                parameters: { value: 50 }
            },
            'texture-input': {
                outputs: [{ name: 'Texture', type: 'texture' }],
                parameters: { texture: null }
            },
            'size': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Size', type: 'number' }],
                parameters: { baseSize: 20, multiplier: 1 }
            },
            'opacity': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Opacity', type: 'number' }],
                parameters: { baseOpacity: 100, multiplier: 1 }
            },
            'hardness': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Hardness', type: 'number' }],
                parameters: { hardness: 80 }
            },
            'flow': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Flow', type: 'number' }],
                parameters: { flow: 100 }
            },
            'scatter': {
                inputs: [{ name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Scatter X', type: 'number' }, { name: 'Scatter Y', type: 'number' }],
                parameters: { scatterX: 10, scatterY: 10 }
            },
            'rotation': {
                inputs: [{ name: 'Angle', type: 'number' }],
                outputs: [{ name: 'Rotation', type: 'number' }],
                parameters: { angle: 0, jitter: 0 }
            },
            'dynamics': {
                inputs: [{ name: 'Pressure', type: 'number' }],
                outputs: [{ name: 'Size', type: 'number' }, { name: 'Opacity', type: 'number' }],
                parameters: { pressureSize: 100, pressureOpacity: 100 }
            },
            'jitter': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Jittered', type: 'number' }],
                parameters: { amount: 20 }
            },
            'multiply': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'add': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'clamp': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Clamped', type: 'number' }],
                parameters: { min: 0, max: 100 }
            },
            'brush-output': {
                inputs: [
                    { name: 'Size', type: 'number' },
                    { name: 'Opacity', type: 'number' },
                    { name: 'Hardness', type: 'number' },
                    { name: 'Flow', type: 'number' },
                    { name: 'Scatter X', type: 'number' },
                    { name: 'Scatter Y', type: 'number' },
                    { name: 'Rotation', type: 'number' },
                    { name: 'Color', type: 'color' }
                ],
                outputs: [],
                parameters: {}
            }
        };
        
        const def = definitions[node.type];
        if (def) {
            node.inputs = def.inputs || [];
            node.outputs = def.outputs || [];
            node.parameters = { ...def.parameters };
        }
    }
    
    createNodeElement(node) {
        const el = document.createElement('div');
        el.className = 'node';
        el.dataset.nodeId = node.id;
        
        // Header
        const header = document.createElement('div');
        header.className = 'node-header';
        header.innerHTML = `
            <span class="node-title">${this.getNodeDisplayName(node.type)}</span>
            <button class="node-delete" data-node-id="${node.id}">×</button>
        `;
        el.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'node-body';
        
        // Sockets
        const sockets = document.createElement('div');
        sockets.className = 'node-sockets';
        
        // Input sockets
        node.inputs.forEach((input, index) => {
            const row = document.createElement('div');
            row.className = 'node-socket-row';
            row.innerHTML = `
                <div class="node-socket input" data-node-id="${node.id}" data-socket-type="input" data-socket-index="${index}"></div>
                <span class="node-socket-label">${input.name}</span>
            `;
            sockets.appendChild(row);
        });
        
        // Output sockets
        node.outputs.forEach((output, index) => {
            const row = document.createElement('div');
            row.className = 'node-socket-row';
            row.innerHTML = `
                <span class="node-socket-label">${output.name}</span>
                <div class="node-socket output" data-node-id="${node.id}" data-socket-type="output" data-socket-index="${index}"></div>
            `;
            sockets.appendChild(row);
        });
        
        body.appendChild(sockets);
        
        // Parameters
        const params = this.createParameterControls(node);
        if (params) {
            body.appendChild(params);
        }
        
        el.appendChild(body);
        
        // Bind events
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-delete')) {
                this.deleteNode(node.id);
                return;
            }
            this.startDragging(node, e);
            this.selectNode(node);
            e.stopPropagation();
        });
        
        // Socket events
        const socketElements = el.querySelectorAll('.node-socket');
        socketElements.forEach(socket => {
            socket.addEventListener('mousedown', (e) => {
                this.startConnection(socket, e);
                e.stopPropagation();
            });
            socket.addEventListener('mouseup', (e) => {
                this.endConnection(socket, e);
                e.stopPropagation();
            });
        });
        
        return el;
    }
    
    createParameterControls(node) {
        const params = node.parameters;
        const keys = Object.keys(params);
        
        if (keys.length === 0) return null;
        
        const container = document.createElement('div');
        
        keys.forEach(key => {
            const param = document.createElement('div');
            param.className = 'node-parameter';
            
            const label = document.createElement('label');
            label.textContent = key.replace(/([A-Z])/g, ' $1').trim();
            
            let input;
            const value = params[key];
            
            if (typeof value === 'number') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = 0;
                input.max = key.includes('angle') || key.includes('rotation') ? 360 : 100;
                input.value = value;
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'node-parameter-value';
                valueDisplay.textContent = value;
                
                input.addEventListener('input', (e) => {
                    node.parameters[key] = parseFloat(e.target.value);
                    valueDisplay.textContent = e.target.value;
                    this.updateBrushPreview();
                });
                
                param.appendChild(label);
                param.appendChild(input);
                param.appendChild(valueDisplay);
            } else if (typeof value === 'string' && value.startsWith('#')) {
                // Color input
                input = document.createElement('input');
                input.type = 'color';
                input.value = value;
                
                input.addEventListener('input', (e) => {
                    node.parameters[key] = e.target.value;
                    this.updateBrushPreview();
                });
                
                param.appendChild(label);
                param.appendChild(input);
            }
            
            container.appendChild(param);
        });
        
        return container;
    }
    
    getNodeDisplayName(type) {
        const names = {
            'color-input': 'Color Input',
            'value-input': 'Value Input',
            'texture-input': 'Texture Input',
            'size': 'Size',
            'opacity': 'Opacity',
            'hardness': 'Hardness',
            'flow': 'Flow',
            'scatter': 'Scatter',
            'rotation': 'Rotation',
            'dynamics': 'Dynamics',
            'jitter': 'Jitter',
            'multiply': 'Multiply',
            'add': 'Add',
            'clamp': 'Clamp',
            'brush-output': 'Brush Output'
        };
        return names[type] || type;
    }
    
    startDragging(node, e) {
        this.draggingNode = node;
        const rect = node.element.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left - this.canvas.offsetX;
        this.dragOffsetY = e.clientY - rect.top - this.canvas.offsetY;
    }
    
    updateNodePosition(node) {
        node.element.style.left = node.x + 'px';
        node.element.style.top = node.y + 'px';
    }
    
    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
        }
        this.selectedNode = node;
        node.element.classList.add('selected');
    }
    
    deleteNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            const node = this.nodes[index];
            
            // Remove connections
            this.connections = this.connections.filter(conn => 
                conn.from.nodeId !== nodeId && conn.to.nodeId !== nodeId
            );
            
            // Remove element
            node.element.remove();
            
            // Remove from array
            this.nodes.splice(index, 1);
            
            this.updateConnections();
            this.updateBrushPreview();
        }
    }
    
    startConnection(socketElement, e) {
        const nodeId = parseInt(socketElement.dataset.nodeId);
        const socketType = socketElement.dataset.socketType;
        const socketIndex = parseInt(socketElement.dataset.socketIndex);
        
        // Only allow starting from output sockets
        if (socketType === 'output') {
            this.connecting = true;
            this.connectionStart = { nodeId, socketType, socketIndex, element: socketElement };
        }
    }
    
    endConnection(socketElement, e) {
        if (!this.connecting) return;
        
        const nodeId = parseInt(socketElement.dataset.nodeId);
        const socketType = socketElement.dataset.socketType;
        const socketIndex = parseInt(socketElement.dataset.socketIndex);
        
        // Only allow ending on input sockets
        if (socketType === 'input' && this.connectionStart) {
            // Don't allow connecting to same node
            if (nodeId !== this.connectionStart.nodeId) {
                this.createConnection(
                    this.connectionStart.nodeId,
                    this.connectionStart.socketIndex,
                    nodeId,
                    socketIndex
                );
            }
        }
        
        this.connecting = false;
        this.connectionStart = null;
        this.removeTempConnection();
    }
    
    createConnection(fromNodeId, fromSocket, toNodeId, toSocket) {
        // Remove any existing connection to this input
        this.connections = this.connections.filter(conn => 
            !(conn.to.nodeId === toNodeId && conn.to.socketIndex === toSocket)
        );
        
        // Add new connection
        this.connections.push({
            from: { nodeId: fromNodeId, socketIndex: fromSocket },
            to: { nodeId: toNodeId, socketIndex: toSocket }
        });
        
        this.updateConnections();
        this.updateBrushPreview();
    }
    
    updateConnections() {
        // Clear existing SVG paths
        this.connectionsSvg.innerHTML = '';
        
        // Draw all connections
        this.connections.forEach(conn => {
            this.drawConnection(conn);
        });
    }
    
    drawConnection(conn) {
        const fromNode = this.nodes.find(n => n.id === conn.from.nodeId);
        const toNode = this.nodes.find(n => n.id === conn.to.nodeId);
        
        if (!fromNode || !toNode) return;
        
        const fromSocket = fromNode.element.querySelector(
            `.node-socket.output[data-socket-index="${conn.from.socketIndex}"]`
        );
        const toSocket = toNode.element.querySelector(
            `.node-socket.input[data-socket-index="${conn.to.socketIndex}"]`
        );
        
        if (!fromSocket || !toSocket) return;
        
        const fromRect = fromSocket.getBoundingClientRect();
        const toRect = toSocket.getBoundingClientRect();
        const containerRect = this.connectionsSvg.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;
        
        // Create bezier curve
        const dx = Math.abs(x2 - x1);
        const handleOffset = Math.min(dx * 0.5, 100);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + handleOffset} ${y1}, ${x2 - handleOffset} ${y2}, ${x2} ${y2}`);
        path.classList.add('node-connection');
        
        // Mark sockets as connected
        fromSocket.classList.add('connected');
        toSocket.classList.add('connected');
        
        this.connectionsSvg.appendChild(path);
    }
    
    drawTempConnection() {
        if (!this.connectionStart || !this.tempConnectionEnd) return;
        
        // Remove old temp connection
        this.removeTempConnection();
        
        const socketRect = this.connectionStart.element.getBoundingClientRect();
        const containerRect = this.connectionsSvg.getBoundingClientRect();
        
        const x1 = socketRect.left + socketRect.width / 2 - containerRect.left;
        const y1 = socketRect.top + socketRect.height / 2 - containerRect.top;
        const x2 = this.tempConnectionEnd.x - containerRect.left;
        const y2 = this.tempConnectionEnd.y - containerRect.top;
        
        const dx = Math.abs(x2 - x1);
        const handleOffset = Math.min(dx * 0.5, 100);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + handleOffset} ${y1}, ${x2 - handleOffset} ${y2}, ${x2} ${y2}`);
        path.classList.add('node-connection', 'temp');
        path.id = 'temp-connection';
        
        this.connectionsSvg.appendChild(path);
    }
    
    removeTempConnection() {
        const temp = document.getElementById('temp-connection');
        if (temp) temp.remove();
    }
    
    evaluateGraph() {
        // Find the output node
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        if (!outputNode) {
            return this.getDefaultBrush();
        }
        
        const brush = this.getDefaultBrush();
        
        // Evaluate each input of the output node
        outputNode.inputs.forEach((input, index) => {
            const connection = this.connections.find(c => 
                c.to.nodeId === outputNode.id && c.to.socketIndex === index
            );
            
            if (connection) {
                const value = this.evaluateNode(connection.from.nodeId, connection.from.socketIndex);
                
                // Map the value to brush properties
                const inputName = input.name.toLowerCase().replace(' ', '');
                if (inputName === 'size') brush.size = value;
                else if (inputName === 'opacity') brush.opacity = value;
                else if (inputName === 'hardness') brush.hardness = value;
                else if (inputName === 'flow') brush.flow = value;
                else if (inputName === 'scatterx') brush.scatterX = value;
                else if (inputName === 'scattery') brush.scatterY = value;
                else if (inputName === 'rotation') brush.angle = value;
                else if (inputName === 'color') brush.color = value;
            }
        });
        
        return brush;
    }
    
    evaluateNode(nodeId, outputIndex) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        // Handle different node types
        switch (node.type) {
            case 'value-input':
                return node.parameters.value || 0;
            
            case 'color-input':
                return node.parameters.color || '#000000';
            
            case 'size':
                const sizeInput = this.getInputValue(node, 0);
                return (node.parameters.baseSize || 20) * (sizeInput / 50 || 1) * (node.parameters.multiplier || 1);
            
            case 'opacity':
                const opacityInput = this.getInputValue(node, 0);
                return (node.parameters.baseOpacity || 100) * (opacityInput / 100 || 1) * (node.parameters.multiplier || 1);
            
            case 'hardness':
                return node.parameters.hardness || 80;
            
            case 'flow':
                return node.parameters.flow || 100;
            
            case 'scatter':
                if (outputIndex === 0) return node.parameters.scatterX || 0;
                if (outputIndex === 1) return node.parameters.scatterY || 0;
                return 0;
            
            case 'rotation':
                return (node.parameters.angle || 0) + (Math.random() * (node.parameters.jitter || 0));
            
            case 'jitter':
                const jitterInput = this.getInputValue(node, 0);
                const jitterAmount = node.parameters.amount || 20;
                return jitterInput + (Math.random() - 0.5) * jitterAmount;
            
            case 'multiply':
                const multA = this.getInputValue(node, 0) || 1;
                const multB = this.getInputValue(node, 1) || 1;
                return multA * multB;
            
            case 'add':
                const addA = this.getInputValue(node, 0) || 0;
                const addB = this.getInputValue(node, 1) || 0;
                return addA + addB;
            
            case 'clamp':
                const clampInput = this.getInputValue(node, 0) || 0;
                const min = node.parameters.min || 0;
                const max = node.parameters.max || 100;
                return Math.max(min, Math.min(max, clampInput));
            
            default:
                return 0;
        }
    }
    
    getInputValue(node, inputIndex) {
        const connection = this.connections.find(c => 
            c.to.nodeId === node.id && c.to.socketIndex === inputIndex
        );
        
        if (connection) {
            return this.evaluateNode(connection.from.nodeId, connection.from.socketIndex);
        }
        
        return 0;
    }
    
    getDefaultBrush() {
        return {
            size: 20,
            opacity: 100,
            hardness: 80,
            flow: 100,
            scatterX: 0,
            scatterY: 0,
            angle: 0,
            color: '#000000'
        };
    }
    
    updateBrushPreview() {
        const rect = this.previewCanvas.getBoundingClientRect();
        
        // Clear canvas
        this.previewCtx.fillStyle = '#ffffff';
        this.previewCtx.fillRect(0, 0, rect.width, rect.height);
        
        // Draw brush preview stroke
        const brush = this.evaluateGraph();
        
        // Draw a sample stroke
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        
        const centerY = rect.height / 2;
        const startX = 20;
        const endX = rect.width - 20;
        
        for (let x = startX; x < endX; x += 5) {
            const y = centerY + Math.sin((x - startX) / 30) * 20;
            this.previewCtx.beginPath();
            this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
            this.previewCtx.fill();
        }
    }
    
    saveBrush() {
        const brush = this.evaluateGraph();
        const brushName = document.getElementById('node-brush-name').value || 'Custom Brush';
        const saveLocation = document.getElementById('node-brush-save-location').value;
        
        // Create brush preset object
        const preset = {
            name: brushName,
            size: Math.round(brush.size),
            opacity: Math.round(brush.opacity),
            hardness: Math.round(brush.hardness),
            flow: Math.round(brush.flow),
            spacing: 10,
            smoothing: 0,
            angle: Math.round(brush.angle),
            angleJitter: 0,
            scatterX: Math.round(brush.scatterX),
            scatterY: Math.round(brush.scatterY),
            nodeGraph: this.serializeGraph()
        };
        
        // Save to the appropriate location
        if (typeof window.state !== 'undefined' && window.state.customBrushes) {
            // Add to custom brushes
            if (!window.state.customBrushes) {
                window.state.customBrushes = [];
            }
            window.state.customBrushes.push(preset);
            
            // Save to localStorage
            if (typeof saveBrushPresetsToStorage === 'function') {
                saveBrushPresetsToStorage();
            }
            
            // Update brush preset dropdown if it exists
            const brushPresetSelect = document.getElementById('brush-preset');
            if (brushPresetSelect) {
                const option = document.createElement('option');
                option.value = brushName;
                option.textContent = brushName;
                brushPresetSelect.appendChild(option);
            }
            
            alert(`Brush "${brushName}" saved successfully to ${saveLocation}!`);
        } else {
            alert('Unable to save brush. Please ensure the application is fully loaded.');
        }
    }
    
    serializeGraph() {
        return {
            nodes: this.nodes.map(n => ({
                id: n.id,
                type: n.type,
                x: n.x,
                y: n.y,
                parameters: n.parameters
            })),
            connections: this.connections
        };
    }
    
    loadGraph(graphData) {
        this.clearAll();
        
        // Recreate nodes
        graphData.nodes.forEach(nodeData => {
            const node = this.createNode(nodeData.type, nodeData.x, nodeData.y);
            node.id = nodeData.id;
            node.parameters = { ...nodeData.parameters };
            
            // Update parameter controls
            const paramInputs = node.element.querySelectorAll('.node-parameter input');
            paramInputs.forEach(input => {
                const key = input.previousElementSibling.textContent.toLowerCase().replace(/\s/g, '');
                if (node.parameters[key] !== undefined) {
                    input.value = node.parameters[key];
                }
            });
        });
        
        // Recreate connections
        graphData.connections.forEach(conn => {
            this.connections.push(conn);
        });
        
        this.updateConnections();
        this.updateBrushPreview();
    }
    
    clearAll() {
        this.nodes.forEach(node => {
            node.element.remove();
        });
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.connectionsSvg.innerHTML = '';
        
        // Recreate default setup
        this.createDefaultSetup();
        this.updateBrushPreview();
    }
    
    show() {
        this.window.classList.add('visible');
        this.updateBrushPreview();
    }
    
    hide() {
        this.window.classList.remove('visible');
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.NodeEditor = NodeEditor;
}
