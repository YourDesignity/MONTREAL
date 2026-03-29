const WS_URL = 'ws://127.0.0.1:8000/ws'; 

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectTimer = null;    
        this.shouldReconnect = false;  // Don't auto-connect until login
        this.onMessageCallback = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.wasConnected = false;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log('🔌 WebSocket: Already connected');
            return;
        }

        // Check for token before connecting
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('⚠️ WebSocket: No token found, cannot connect');
            return;
        }

        try {
            console.log('🔌 WebSocket: Attempting connection...');
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('✅ WebSocket Connected');
                this.reconnectAttempts = 0;
                this.wasConnected = true;
            };

            this.socket.onmessage = (event) => {
                if (this.onMessageCallback) {
                    try {
                        const data = JSON.parse(event.data);
                        this.onMessageCallback(data);
                    } catch (e) {
                        console.error("WS Parse Error", e);
                    }
                }
            };

            this.socket.onclose = () => {
                if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 WebSocket Reconnecting in 5s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.warn('⚠️ WebSocket: Max reconnection attempts reached.');
                }
            };

            this.socket.onerror = (err) => {
                console.error("WebSocket Error:", err);
                this.socket.close();
            };
        } catch (e) {
            console.error("WS Connection Exception", e);
        }
    }

    disconnect() {
        console.log('🔌 WebSocket: Disconnecting...');
        this.shouldReconnect = false;  // Prevent reconnection
        this.wasConnected = false;     // Reset connection state
        this.reconnectAttempts = 0;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Logout');
            this.socket = null;
        }
    }

    register(callback) {
        this.onMessageCallback = callback;
        this.shouldReconnect = true;
        this.connect();
    }

    unregister() {
        this.shouldReconnect = false;
        clearTimeout(this.reconnectTimer);
        if (this.socket) {
            this.socket.close();
        }
        this.socket = null;
    }
}

const websocketService = new WebSocketService();
export default websocketService;