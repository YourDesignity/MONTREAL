register(callback) {
    this.onMessageCallback = callback;
    this.shouldReconnect = true;
    // Don't call connect() here - it's now called explicitly from AuthContext after login
}