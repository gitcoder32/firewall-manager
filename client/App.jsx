import { useState, useEffect } from 'react'
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

function App() {
  const [status, setStatus] = useState({ profile: 'Loading...', status: 'Loading...' });
  const [isLoading, setIsLoading] = useState(false);
  const [rules, setRules] = useState([]); // State for rules list
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    port: '',
    protocol: 'TCP',
    action: 'Block'
  });

  useEffect(() => {
    fetchStatus();
    fetchRules(); // Fetch rules when app starts
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/status');
      if (res.data.success) {
        setStatus({ profile: res.data.profile, status: res.data.status });
      }
    } catch (err) {
      console.error("Status fetch error");
    }
  };

  // NEW: Function to get rules from backend
  const fetchRules = async () => {
    try {
      const res = await api.get('/rules');
      if (res.data.success) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.error("Failed to fetch rules");
    }
  };

  const toggleFirewall = async () => {
    const newState = status.status === 'Active' ? 'off' : 'on';
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
        const res = await api.post('/toggle', { state: newState });
        if (res.data.success) {
            setSuccessMessage(`Firewall turned ${newState.toUpperCase()} successfully.`);
            fetchStatus();
        } else {
            setErrorMessage(res.data.error || `Failed to turn firewall ${newState}.`);
        }
    } catch (err) {
         setErrorMessage(err.response?.data?.error || "Failed to toggle firewall connection.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if(!formData.name || !formData.port) {
        setErrorMessage("Rule Name and Port are required.");
        setIsLoading(false);
        return;
    }

    try {
        const res = await api.post('/rules', formData);
        if (res.data.success) {
            setSuccessMessage(`Rule '${formData.name}' added successfully.`);
            setFormData({ name: '', port: '', protocol: 'TCP', action: 'Block' });
            fetchRules(); // REFRESH THE LIST after adding
        } else {
            setErrorMessage(res.data.error || "Failed to add rule.");
        }
    } catch (err) {
        setErrorMessage(err.response?.data?.error || "Failed to connect to add rule.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFirewallOn = status.status === 'Active';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white">Firewall Hub</h1>
        <p className="text-slate-400 mt-2">Manage your Windows Firewall rules with ease.</p>
      </header>

      {errorMessage && (
        <div className="bg-red-900/50 border-l-4 border-red-600 text-red-200 p-4 mb-6 rounded">
          Error: {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-900/50 border-l-4 border-green-600 text-green-200 p-4 mb-6 rounded">
          Success: {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-2xl font-semibold mb-6 text-white">Firewall Status</h2>
            <div className="flex justify-between mb-3">
              <span className="text-slate-400">Profile:</span>
              <span className="font-medium">{status.profile}</span>
            </div>
            <div className="flex justify-between mb-8">
              <span className="text-slate-400">Status:</span>
              <span className={`font-bold ${isFirewallOn ? 'text-green-400' : 'text-red-400'}`}>
                {status.status}
              </span>
            </div>
            <button 
              onClick={() => { fetchStatus(); fetchRules(); }} 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-colors disabled:opacity-50">
              {isLoading ? 'Processing...' : 'Refresh Status'}
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4 text-white">Firewall Toggle</h2>
            <p className="text-slate-400 mb-6">Turn the firewall on or off for all profiles.</p>
            <button 
               onClick={toggleFirewall}
               disabled={isLoading}
               className={`w-full font-semibold py-3 rounded transition-colors disabled:opacity-50 ${
                   isFirewallOn ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
               }`}>
              {isFirewallOn ? 'Turn Firewall OFF' : 'Turn Firewall ON'}
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-2xl font-semibold mb-6 text-white">Add New Rule</h2>
            <form onSubmit={handleAddRule}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Rule Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., MyWebApp" className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Port</label>
                  <input type="text" name="port" value={formData.port} onChange={handleInputChange} placeholder="e.g., 8080" className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Protocol</label>
                  <select name="protocol" value={formData.protocol} onChange={handleInputChange} className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 focus:outline-none">
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Action</label>
                  <select name="action" value={formData.action} onChange={handleInputChange} className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 focus:outline-none">
                    <option value="Block">Block</option>
                    <option value="Allow">Allow</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-colors disabled:opacity-50">Add Rule</button>
            </form>
          </div>

          {/* MANAGED RULES LIST - UPDATED */}
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 min-h-[200px] flex flex-col">
            <h2 className="text-2xl font-semibold mb-6 text-white">Managed Rules (Custom Ports)</h2>
            
            {rules.length === 0 ? (
                <div className="flex-grow flex items-center justify-center text-slate-500">
                   No custom rules found (showing only rules with specific ports).
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300">
                        <thead>
                            <tr className="border-b border-slate-600 text-slate-400">
                                <th className="p-3">Name</th>
                                <th className="p-3">Port</th>
                                <th className="p-3">Protocol</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule, index) => (
                                <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-3 font-medium text-white">{rule.name}</td>
                                    <td className="p-3">{rule.port}</td>
                                    <td className="p-3">{rule.protocol}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${rule.action.toLowerCase() === 'block' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                                            {rule.action.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App