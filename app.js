class IMEIScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.imeiOutput = document.getElementById('imeiOutput');
        this.ctx = this.canvas.getContext('2d');
        this.imeis = new Set();
        this.model = null;
        this.stream = null;

        this.initializeEventListeners();
    }

    async initializeEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('capturePhoto').addEventListener('click', () => this.capturePhoto());
        document.getElementById('stopCamera').addEventListener('click', () => this.stopCamera());
        document.getElementById('copyButton').addEventListener('click', () => this.copyIMEIs());
        document.getElementById('emailButton').addEventListener('click', () => this.emailResults());

        // Initialize TensorFlow model
        await this.loadModel();
    }

    async loadModel() {
        // Load a pre-trained model for IMEI detection
        // Note: In a production environment, you would train a custom model specifically for IMEI detection
        // For now, we'll use a general object detection model and implement custom IMEI pattern recognition
        this.model = await cocoSsd.load();
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            this.video.srcObject = this.stream;
            this.video.play();
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please make sure to grant camera permissions.');
        }
    }

    async capturePhoto() {
        if (!this.video.srcObject) {
            alert('Please start the camera first!');
            return;
        }

        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Convert canvas to image for processing
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Process image for IMEI detection
        await this.processImage(imageData);
    }

    async processImage(imageData) {
        try {
            // Convert canvas to tensor
            const tensor = tf.browser.fromPixels(imageData);
            
            // Run object detection
            const predictions = await this.model.detect(tensor);
            
            // Convert tensor back to image for display
            const img = await tf.browser.toPixels(tensor);
            
            // Extract text regions and perform IMEI pattern matching
            for (const prediction of predictions) {
                if (prediction.class === 'text') {
                    // Extract text region
                    const textRegion = this.ctx.getImageData(
                        prediction.bbox[0],
                        prediction.bbox[1],
                        prediction.bbox[2],
                        prediction.bbox[3]
                    );
                    
                    // Convert image to text using Tesseract.js or similar
                    // This is a placeholder - in production you would use a proper OCR service
                    const text = await this.extractTextFromImage(textRegion);
                    
                    // Check for IMEI pattern (15 digits)
                    const imeiPattern = /\d{15}/g;
                    const matches = text.match(imeiPattern);
                    
                    if (matches) {
                        matches.forEach(imei => {
                            this.imeis.add(imei);
                        });
                    }
                }
            }
            
            // Update display
            this.updateIMEIOutput();
            
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    extractTextFromImage(imageData) {
        // This is a placeholder - in production you would use a proper OCR service
        // For now, we'll return a mock result
        return new Promise((resolve) => {
            // In a real implementation, you would send this to a proper OCR service
            // For demonstration purposes, we'll return a mock result
            setTimeout(() => {
                resolve('123456789012345'); // Mock IMEI
            }, 1000);
        });
    }

    updateIMEIOutput() {
        const imeiArray = Array.from(this.imeis);
        this.imeiOutput.value = imeiArray.join('\n');
    }

    copyIMEIs() {
        this.imeiOutput.select();
        document.execCommand('copy');
        alert('IMEIs copied to clipboard!');
    }

    emailResults() {
        const imeiArray = Array.from(this.imeis);
        const subject = 'IMEI Scanner Results';
        const body = imeiArray.join('\n');
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }
}

// Initialize the scanner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new IMEIScanner();
});
