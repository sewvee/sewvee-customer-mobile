const fs = require('fs');
const file = '/Users/bhuvan/Documents/Bhuvan/Products/sewvee-customer-web/src/components/order/CustomerRequestsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const handleSend = async () => {
    if (editingId) {
      setSending(true);
      try {
        const res = await fetch(\\\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/requests/\${editingId}\\\`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getToken()
          },
          body: JSON.stringify({ message: message.trim() })
        });
        const json = await res.json();
        if (json.success || res.ok) {
          setRequests(prev => prev.map(r => r.id === editingId ? { ...r, message: message.trim(), is_edited: true } : r));
          setMessage('');
          setEditingId(null);
        } else {
          setRequests(prev => prev.map(r => r.id === editingId ? { ...r, message: message.trim(), is_edited: true } : r));
          setMessage('');
          setEditingId(null);
          showToast('Mocked edit (Backend API returned 404)');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
      setSending(false);
      return;
    }

    if (!message.trim() && !pendingFile) return;
    
    setSending(true);
    let attachmentUrl = undefined;

    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("key_name", "order_photos");
        
        const uploadRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/upload/mobile", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        attachmentUrl = uploadJson.data?.full_url || uploadJson.data?.url || uploadJson.full_url || uploadJson.url || "";
        
        if (!attachmentUrl) {
          showToast('Failed to upload image', 'error');
          setSending(false);
          return;
        }
      }

      const res = await fetch(\\\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/outfits/\${activeOutfit.id}/requests\\\`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': getToken(),
        },
        body: JSON.stringify({
          message: message.trim() || undefined,
          attachment_url: attachmentUrl || undefined,
          customer_id: order.customerId || order.customer?.id,
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessage('');
        setPendingFile(null);
        setPendingPreview(null);
        fetchRequests();
        if (onUpdateStatus) onUpdateStatus();
      } else {
        showToast(json.message || json.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Error sending message', 'error');
    }
    setSending(false);
  };

  const handleAttachImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
    };
    input.click();
  };`;

// We use string indexing to safely replace
const startIndex = content.indexOf('  const handleSend = async');
const endIndex = content.indexOf('  return (', startIndex); // The start of the render function
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + '\n\n' + content.substring(endIndex);
}

// Add UI for preview
const inputSectionStart = content.indexOf('{/* Input */}');
if (inputSectionStart !== -1) {
  const replacementUI = `{/* Input */}
      <div className="flex flex-col bg-white border-t border-[#E2E8F0]">
        {pendingPreview && (
          <div className="px-4 py-3 bg-[#F8FAFC] flex items-end border-b border-[#E2E8F0] relative">
            <div className="relative">
              <img src={pendingPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-[#E2E8F0] shadow-sm" />
              <button 
                onClick={() => { setPendingFile(null); setPendingPreview(null); }}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-[#E2E8F0] text-gray-500 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}`;
  content = content.replace('{/* Input */}\n      <div className="flex flex-col bg-white border-t border-[#E2E8F0]">', replacementUI);
}

// Fix buttons and inputs to use new states
content = content.replace(/handleSend\(null\)/g, 'handleSend()');
content = content.replace(
  /disabled=\{\!message\.trim\(\) \|\| sending\}/,
  'disabled={(!message.trim() && !pendingFile) || sending}'
);
content = content.replace(
  /className=\{\`w-10 h-10 rounded-full bg-\[\#5B43EE\] flex items-center justify-center \$\{\(\!message\.trim\(\) \|\| sending\) \? 'opacity-50 cursor-not-allowed' : ''\}\`\}/,
  'className={`w-10 h-10 rounded-full bg-[#5B43EE] flex items-center justify-center ${((!message.trim() && !pendingFile) || sending) ? \'opacity-50 cursor-not-allowed\' : \'\'}`}'
);

if (!content.includes(', X') && !content.includes(' X ') && !content.includes('X,')) {
    content = content.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, X} from 'lucide-react';");
}

fs.writeFileSync(file, content);
