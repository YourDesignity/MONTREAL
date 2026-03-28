const WS_URL = 'ws://127.0.0.1:8000/ws'; 

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectTimer = null;    
        this.shouldReconnect = true;   
        this.onMessageCallback = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    connect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ WebSocket: Max reconnection attempts reached. Stopping.');
            this.shouldReconnect = false;
            return;
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            console.log(`🔌 WebSocket: Attempting connection... (Attempt ${this.reconnectAttempts + 1})`);
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('✅ WebSocket Connected');
                this.reconnectAttempts = 0;
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

            this.socket.onclose = (event) => {
                console.log(`🔴 WebSocket Closed (Code: ${event.code}, Reason: ${event.reason || 'None'})`);

                if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 WebSocket Reconnecting in 5s... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
                }
            };

            this.socket.onerror = (err) => {
                console.error("❌ WebSocket Error:", err);
                console.error("Error Details:", {
                    readyState: this.socket?.readyState,
                    url: WS_URL
                });
                // Let onclose handle reconnection
            };
        } catch (e) {
            console.error("WS Connection Exception", e);
        }
    }

    register(callback) {
        this.onMessageCallback = callback;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.connect();
    }

    unregister() {
        this.shouldReconnect = false;
        clearTimeout(this.reconnectTimer);
        if (this.socket) {
            this.socket.close();
        }
        this.socket = null;
        this.reconnectAttempts = 0;
    }
}

const websocketService = new WebSocketService();
export default websocketService;