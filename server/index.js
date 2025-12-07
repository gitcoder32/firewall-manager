const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Helper function to run Python script
const runPythonScript = (args, res) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'firewall_controller.py'), ...args]);
    
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 || errorString) {
            console.error(`Python script error: ${errorString}`);
            try {
                const jsonError = JSON.parse(dataString || errorString);
                return res.status(500).json(jsonError);
            } catch (e) {
                return res.status(500).json({ success: false, error: errorString || "Unknown script error" });
            }
        }
        try {
             // Parse JSON output from Python stdout
            const jsonOutput = JSON.parse(dataString);
            res.json(jsonOutput);
        } catch (e) {
            console.error("Failed to parse Python output:", dataString);
            res.status(500).json({ success: false, error: "Failed to parse server response." });
        }
    });
};

// --- API Routes ---

// 1. Get Firewall Status
app.get('/api/status', (req, res) => {
    runPythonScript(['status'], res);
});

// 2. Toggle Firewall On/Off
app.post('/api/toggle', (req, res) => {
    const { state } = req.body; // expects "on" or "off"
    if (!state || (state !== 'on' && state !== 'off')) {
        return res.status(400).json({ success: false, error: "Invalid state provided." });
    }
    runPythonScript(['toggle', state], res);
});

// 3. Add new firewall rule
app.post('/api/rules', (req, res) => {
    const { name, port, protocol, action } = req.body;
    if (!name || !port || !protocol || !action) {
         return res.status(400).json({ success: false, error: "Missing required rule parameters." });
    }
    // Sanitize inputs to prevent command injection
    const cleanName = name.replace(/[^a-zA-Z0-9_\-\s]/g, '');
    const cleanPort = port.toString().replace(/[^0-9,\-]/g, ''); 

    runPythonScript(['add_rule', cleanName, cleanPort, protocol, action], res);
});

// 4. Get List of Rules (NEW FEATURE)
app.get('/api/rules', (req, res) => {
    runPythonScript(['get_rules'], res);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("REMINDER: Ensure this terminal was opened with 'Run as Administrator'.");
});