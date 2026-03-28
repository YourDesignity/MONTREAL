const WS_URL = 'ws://127.0.0.1:8000/ws'; 

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectTimer = null;
        this.shouldReconnect = false;
        this.onMessageCallback = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.wasConnected = false;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log('🔌 WebSocket: Already connected or connecting');
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('⚠️ WebSocket: Cannot connect - user not authenticated. Call connect() after login.');
            return;
        }

        try {
            console.log('🔌 WebSocket: Attempting connection...');
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('✅ WebSocket: Connected successfully');
                this.wasConnected = true;
                this.shouldReconnect = true;
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                if (this.onMessageCallback) {
                    try {
                        const data = JSON.parse(event.data);
                        this.onMessageCallback(data);
                    } catch (e) {
                        console.error("❌ WebSocket: Failed to parse message", e);
                    }
                }
            };

            this.socket.onclose = (event) => {
                console.log('🔌 WebSocket: Connection closed', {
                    code: event.code,
                    reason: event.reason || 'No reason provided',
                    wasClean: event.wasClean
                });

                this.socket = null;

                if (this.wasConnected && this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 32000);
                    console.log(`🔄 WebSocket: Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    this.reconnectTimer = setTimeout(() => this.connect(), delay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('❌ WebSocket: Max reconnection attempts reached. Please refresh the page.');
                }
            };

            this.socket.onerror = (err) => {
                console.error('❌ WebSocket: Connection error', err);
            };
        } catch (e) {
            console.error('❌ WebSocket: Failed to create connection', e);
        }
    }

    disconnect() {
        console.log('🔌 WebSocket: Manually disconnecting...');
        this.shouldReconnect = false;
        this.wasConnected = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'User logged out');
            this.socket = null;
        }
    }

    register(callback) {
        this.onMessageCallback = callback;
    }

    unregister() {
        this.onMessageCallback = null;
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ WebSocket: Cannot send message - not connected');
        }
    }
}

const websocketService = new WebSocketService();
export default websocketService;