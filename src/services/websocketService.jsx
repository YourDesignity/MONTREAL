const WS_URL = 'ws://127.0.0.1:8000/ws'; 

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectTimer = null;    
        this.shouldReconnect = true;   
        this.onMessageCallback = null;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('✅ WebSocket Connected');
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
                if (this.shouldReconnect) {
                    console.log('🔄 WebSocket Reconnecting in 5s...');
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
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