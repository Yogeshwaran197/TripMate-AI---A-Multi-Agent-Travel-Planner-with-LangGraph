const chatInput = document.getElementById('chatInput');
const submitBtn = document.getElementById('submitBtn');
const messagesContainer = document.getElementById('messages');
const clearBtn = document.getElementById('clearBtn');

let conversationHistory = [];
let isLoading = false;

// Load conversation history
function loadHistory() {
  try {
    const saved = localStorage.getItem('tripmate_history');
    if (saved) {
      conversationHistory = JSON.parse(saved);
      if (Array.isArray(conversationHistory)) {
        conversationHistory.forEach(msg => {
          if (msg.role === 'assistant' && msg.travelData) {
            addMessageToUI('user', msg.content);
            displayTravelResults(msg.travelData);
          } else {
            addMessageToUI(msg.role, msg.content);
          }
        });
      }
    }
  } catch (e) {
    conversationHistory = [];
  }
}

// Save conversation history
function saveHistory() {
  try {
    localStorage.setItem('tripmate_history', JSON.stringify(conversationHistory.slice(-20)));
  } catch (e) {}
}

// Get current time
function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add message bubble to UI
function addMessageToUI(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;

  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'U' : 'A';

  const sender = document.createElement('span');
  sender.className = 'message-sender';
  sender.textContent = role === 'user' ? 'You' : 'TripMate AI';

  headerDiv.appendChild(avatar);
  headerDiv.appendChild(sender);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (role === 'assistant' && content) {
    bubble.innerHTML = cleanMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = getTimeString();

  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(bubble);
  messageDiv.appendChild(time);
  messagesContainer.appendChild(messageDiv);

  scrollToBottom();
}

// Clean markdown and format text for display
function cleanMarkdown(text) {
  if (!text) return '';

  let clean = text;

  // Remove markdown table formatting (keep content)
  clean = clean.replace(/^\|[\s]*$/gm, '');
  clean = clean.replace(/\|/g, ' ');
  
  // Remove markdown headers but keep as paragraphs
  clean = clean.replace(/^#{1,6}\s+/gm, '');
  
  // Remove blockquotes
  clean = clean.replace(/^>\s+/gm, '');
  
  // Remove horizontal rules
  clean = clean.replace(/^---+$/gm, '');
  clean = clean.replace(/^\*\*\*+$/gm, '');
  clean = clean.replace(/^___+$/gm, '');
  
  // Remove bold markers
  clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
  clean = clean.replace(/__(.+?)__/g, '$1');
  
  // Remove italic markers
  clean = clean.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
  clean = clean.replace(/_(.+?)_/g, '$1');
  
  // Remove strikethrough
  clean = clean.replace(/~~(.+?)~~/g, '$1');
  
  // Remove inline code markers
  clean = clean.replace(/`(.+?)`/g, '$1');
  
  // Remove code blocks
  clean = clean.replace(/```[\s\S]*?```/g, '');
  
  // Remove list markers
  clean = clean.replace(/^[-*+]\s+/gm, '');
  clean = clean.replace(/^\d+\.\s+/gm, '');
  clean = clean.replace(/^\d+\)/gm, '');
  
  // Remove task list markers
  clean = clean.replace(/^[\[x\]]\s+/gi, '');
  
  // Remove checkbox markers
  clean = clean.replace(/^[✓✅xX]\s+/gm, '');
  
  // Remove numbered section markers like "1️⃣", "2️⃣"
  clean = clean.replace(/\d+️⃣/g, '');
  
  // Remove emoji-only lines that are just decoration
  clean = clean.replace(/^[\s]*[\p{Emoji}]+[\s]*$/gu, '');
  
  // Clean up multiple consecutive newlines
  clean = clean.replace(/\n{3,}/g, '\n\n');
  
  // Clean up whitespace
  clean = clean.replace(/^[ \t]+$/gm, '');
  
  // Convert to paragraphs with br for single breaks
  let html = clean
    .split('\n\n')
    .filter(line => line.trim())
    .map(para => {
      // Handle inline line breaks within paragraph
      let lines = para.split('\n').filter(l => l.trim());
      return lines.join('<br>');
    })
    .join('</p><p>');
  
  // Wrap in paragraph tags
  if (html) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

// Display structured travel results
function displayTravelResults(data) {
  const container = document.createElement('div');
  container.className = 'travel-results';
  
  const header = document.createElement('div');
  header.className = 'results-header';
  
  const title = document.createElement('div');
  title.className = 'results-title';
  title.innerHTML = '<span>📋 Trip Summary</span>';
  
  const toggle = document.createElement('button');
  toggle.className = 'results-toggle';
  toggle.textContent = 'Show details';
  toggle.onclick = () => toggleDetails(container);
  
  header.appendChild(title);
  header.appendChild(toggle);
  
  const content = document.createElement('div');
  content.className = 'results-content';
  
  // Trip overview
  if (data.answer) {
    const overview = document.createElement('div');
    overview.className = 'result-section';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'result-section-title';
    sectionTitle.innerHTML = '<span>🗺️ Trip Overview</span>';
    
    const overviewCard = document.createElement('div');
    overviewCard.className = 'result-card';
    
    const overviewContent = document.createElement('div');
    overviewContent.className = 'result-card-content';
    overviewContent.innerHTML = cleanMarkdown(data.answer);
    
    overviewCard.appendChild(overviewContent);
    overview.appendChild(sectionTitle);
    overview.appendChild(overviewCard);
    content.appendChild(overview);
  }
  
  // Flights
  if (data.flight_results && data.flight_results.trim()) {
    const flights = document.createElement('div');
    flights.className = 'result-section';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'result-section-title';
    sectionTitle.innerHTML = '<span>✈️ Flights</span>';
    
    const flightsCard = document.createElement('div');
    flightsCard.className = 'result-card';
    
    const flightsContent = document.createElement('div');
    flightsContent.className = 'result-card-content';
    flightsContent.innerHTML = cleanMarkdown(data.flight_results);
    
    flightsCard.appendChild(flightsContent);
    flights.appendChild(sectionTitle);
    flights.appendChild(flightsCard);
    content.appendChild(flights);
  }
  
  // Hotels
  if (data.hotel_results && data.hotel_results.trim()) {
    const hotels = document.createElement('div');
    hotels.className = 'result-section';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'result-section-title';
    sectionTitle.innerHTML = '<span>🏨 Hotels</span>';
    
    const hotelsCard = document.createElement('div');
    hotelsCard.className = 'result-card';
    
    const hotelsContent = document.createElement('div');
    hotelsContent.className = 'result-card-content';
    hotelsContent.innerHTML = cleanMarkdown(data.hotel_results);
    
    hotelsCard.appendChild(hotelsContent);
    hotels.appendChild(sectionTitle);
    hotels.appendChild(hotelsCard);
    content.appendChild(hotels);
  }
  
  // Itinerary
  if (data.itinerary && data.itinerary.trim()) {
    const itinerary = document.createElement('div');
    itinerary.className = 'result-section';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'result-section-title';
    sectionTitle.innerHTML = '<span>📅 Day-by-Day Itinerary</span>';
    
    const itineraryCard = document.createElement('div');
    itineraryCard.className = 'result-card';
    
    const itineraryContent = document.createElement('div');
    itineraryContent.className = 'result-card-content';
    itineraryContent.innerHTML = cleanMarkdown(data.itinerary);
    
    itineraryCard.appendChild(itineraryContent);
    itinerary.appendChild(sectionTitle);
    itinerary.appendChild(itineraryCard);
    content.appendChild(itinerary);
  }
  
  container.appendChild(header);
  container.appendChild(content);
  messagesContainer.appendChild(container);
  
  scrollToBottom();
}

// Toggle details visibility
function toggleDetails(container) {
  const content = container.querySelector('.results-content');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    container.querySelector('.results-toggle').textContent = 'Hide details';
  } else {
    content.style.display = 'none';
    container.querySelector('.results-toggle').textContent = 'Show details';
  }
}

// Scroll to bottom
function scrollToBottom() {
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

// Clear chat
function clearChat() {
  conversationHistory = [];
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🗺️</div>
      <div class="empty-title">Start planning your trip</div>
      <div class="empty-text">Tell us where you want to go</div>
    </div>
  `;
  saveHistory();
  chatInput.focus();
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  if (isLoading) return;

  const message = chatInput.value.trim();
  if (!message) return;

  isLoading = true;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Planning...';
  chatInput.disabled = true;
  chatInput.value = '';

  addMessageToUI('user', message);
  conversationHistory.push({ role: 'user', content: message });
  saveHistory();

  try {
    const response = await fetch('/api/travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id: null }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    // Add assistant message
    addMessageToUI('assistant', data.answer || 'No response received');
    
    // Display structured travel results
    if (data.flight_results || data.hotel_results || data.itinerary) {
      displayTravelResults({
        answer: data.answer || '',
        flight_results: data.flight_results || '',
        hotel_results: data.hotel_results || '',
        itinerary: data.itinerary || ''
      });
      
      conversationHistory.push({
        role: 'assistant',
        content: data.answer || '',
        travelData: {
          answer: data.answer || '',
          flight_results: data.flight_results || '',
          hotel_results: data.hotel_results || '',
          itinerary: data.itinerary || ''
        }
      });
    } else {
      conversationHistory.push({ role: 'assistant', content: data.answer || '' });
    }
    
    saveHistory();

  } catch (error) {
    addMessageToUI('assistant', `⚠️ ${error.message}`);
    conversationHistory.push({ role: 'assistant', content: `⚠️ ${error.message}` });
    saveHistory();
  } finally {
    isLoading = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Plan Trip';
    chatInput.disabled = false;
    chatInput.focus();
  }
}

// Event listeners
submitBtn.addEventListener('click', handleSubmit);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e);
  }
});

clearBtn.addEventListener('click', clearChat);

// Initialize
loadHistory();
chatInput.focus();
