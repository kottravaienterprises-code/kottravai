import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/context/ProductContext';
import { useCart } from '@/context/CartContext';
import analytics from '@/utils/analyticsService';
import { API_ENDPOINTS } from '@/config/api';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    type?: 'text' | 'product-list' | 'options';
    products?: any[];
    options?: { label: string; value: string }[];
}

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const { products } = useProducts();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [isTyping, setIsTyping] = useState(false);
    const chatId = useRef(`session-${Math.random().toString(36).substring(2, 11)}`);
    const messageRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    const [showTeaser, setShowTeaser] = useState(false);
    const [teaserText, setTeaserText] = useState("");
    // Escalation contact-collection flow
    const [escalationStep, setEscalationStep] = useState<null | 'ask_contact'>(null);
    const pendingEscalationReason = useRef<string>('Customer requested live support');
    const [typingText, setTypingText] = useState("Thozhi is thinking...");

    const teaserMessages = [
        "👋 Hello! Looking for healthy mixes or traditional products?",
        "Need help finding eco-friendly gifts or handmade collections?",
        "Hi! I can help you explore Kottravai’s popular products."
    ];

    const TYPING_MESSAGES = [
        "Thozhi is finding the best products for you...",
        "Looking through Kottravai collections...",
        "Finding handmade and traditional picks for you...",
        "Curating your traditional shopping list...",
        "Almost there, finding your authentic favorites..."
    ];

    const QUICK_REPLIES = {
        food: ["Healthy Breakfast", "Traditional Mixes", "Spices & Podi"],
        gifts: ["Trending Hampers", "Eco-Friendly Gifts", "Handcrafted Decor"],
        jewellery: ["Temple Designs", "Traditional Earrings", "Latest Collections"],
        general: ["Best Sellers", "New Arrivals", "Gifting Ideas"]
    };

    useEffect(() => {
        if (isOpen) {
            analytics.trackEvent('chat_opened');
            setShowTeaser(false);
        }
    }, [isOpen]);

    useEffect(() => {
        // Proactive Teaser Logic (Step 2 & 7)
        const lastTeaser = localStorage.getItem('thozhi_teaser_last_shown');
        const now = Date.now();
        const fourHours = 4 * 60 * 60 * 1000;

        if (!isOpen && (!lastTeaser || (now - parseInt(lastTeaser)) > fourHours)) {
            const timer = setTimeout(() => {
                setTeaserText(teaserMessages[Math.floor(Math.random() * teaserMessages.length)]);
                setShowTeaser(true);
                localStorage.setItem('thozhi_teaser_last_shown', now.toString());

                // Auto-hide after 15s (Step 6)
                setTimeout(() => setShowTeaser(false), 15000);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    id: '1',
                    text: "Hello! Welcome to Kottravai. I'm Thozhi AI, your personal shopping assistant. How can I help you today?",
                    sender: 'bot',
                    type: 'options',
                    options: [
                        { label: '🎁 Gift Advisor Quiz', value: 'gifting quiz' },
                        { label: '🛍️ Shop Collections', value: 'I want to shop' },
                        { label: '📦 Track Order', value: 'Track my order' },
                        { label: '⭐ Best Sellers', value: 'Show me best sellers' },
                        { label: '🆘 Speak to Support', value: '__escalate__' }
                    ]
                }
            ]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        if (messages.length > 0) {
            const latestMsg = messages[messages.length - 1];
            
            if (latestMsg.sender === 'bot') {
                // For assistant messages, scroll to the TOP of the message
                // This ensures the user sees the intro text first, not the bottom cards
                messageRefs.current[latestMsg.id]?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            } else {
                // For user messages, we can still scroll to the message itself
                messageRefs.current[latestMsg.id]?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end' 
                });
            }
        }
    }, [messages]);

    const processBotResponse = async (userText: string) => {
        try {
            setTypingText(TYPING_MESSAGES[Math.floor(Math.random() * TYPING_MESSAGES.length)]);
            setIsTyping(true);

            // Prepare history for RAG (Role mapping: bot -> assistant)
            const history = messages.slice(-8).map(m => ({
                role: m.sender === 'bot' ? 'assistant' : 'user',
                content: m.text
            }));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

            const response = await fetch(API_ENDPOINTS.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userText, 
                    history,
                    sessionId: chatId.current
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('API_ERROR');

            const data = await response.json();

            // Execute chatbot actions (such as ADD_TO_CART)
            if (data.actions && Array.isArray(data.actions)) {
                data.actions.forEach((act: any) => {
                    if (act.type === 'ADD_TO_CART') {
                        const targetProd = products.find(p => p.id === act.productId || p.original_id === act.productId);
                        if (targetProd) {
                            console.log("🛒 ChatWidget adding product to cart:", targetProd.name, "Quantity:", act.quantity);
                            addToCart(targetProd, act.quantity);
                        } else {
                            console.warn("⚠️ ChatWidget action referenced unknown product ID:", act.productId);
                        }
                    }
                });
            }

            const fallbackText = "I couldn’t find exact matches right now, but you might enjoy exploring our traditional mixes, healthy food collections, or handcrafted gifts. Here are some options you might like!";
            const replyText = data.reply || fallbackText;

            // Dynamic Product Tag Parsing
            const productRegex = /\[PRODUCT:([^\]]+)\]/g;
            const tagMatches = Array.from(replyText.matchAll(productRegex));
            const productIds = tagMatches.map((match: any) => match[1]);
            
            const cleanText = replyText.replace(productRegex, '').trim();

            const matchedProducts = productIds
                .map(id => {
                    const found = products.find(p => p.id === id || p.original_id === id);
                    if (!found) console.warn(`⚠️ Thozhi AI referenced a non-existent product: ${id}`);
                    return found;
                })
                .filter(Boolean);

            const botMsg: Message = {
                id: Date.now().toString(),
                text: cleanText || fallbackText,
                sender: 'bot',
                // Priority: options (quiz buttons) > product-list > text
                type: data.options?.length ? 'options' : (matchedProducts.length > 0 ? 'product-list' : 'text'),
                products: matchedProducts.length > 0 ? matchedProducts : undefined,
                options: data.options?.length ? data.options : undefined
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Thozhi AI Error:', error);
            const errorMsg: Message = {
                id: Date.now().toString(),
                text: "I’m having a small moment to catch my breath! While I get back on track, you might enjoy browsing our latest handmade collections or traditional health mixes directly from the menu.",
                sender: 'bot'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const sendEscalation = async (contact: string, reason?: string) => {
        setEscalationStep(null);
        setIsTyping(true);
        setTypingText('Connecting you to support...');

        const history = messages.slice(-12).map(m => ({
            role: m.sender === 'bot' ? 'assistant' : 'user',
            content: m.text
        }));

        // Parse contact: detect phone vs email
        const isEmail = contact.includes('@');
        const isPhone = /^[\d\s\+\-]{7,15}$/.test(contact.trim());

        try {
            const response = await fetch(API_ENDPOINTS.chatEscalate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: chatId.current,
                    customerEmail: isEmail ? contact.trim() : undefined,
                    customerPhone: isPhone ? contact.trim() : undefined,
                    customerName: (!isEmail && !isPhone) ? contact.trim() : undefined,
                    contactRaw: contact.trim(),
                    reason: reason || pendingEscalationReason.current,
                    history
                })
            });
            const data = await response.json();
            const botMsg: Message = {
                id: Date.now().toString(),
                text: data.reply || 'Your request has been received. A support member will contact you shortly.',
                sender: 'bot',
                type: 'text'
            };
            setMessages(prev => [...prev, botMsg]);
        } catch {
            const botMsg: Message = {
                id: Date.now().toString(),
                text: 'Your escalation request was noted. Please reach us directly on WhatsApp: +91 88078 29183.',
                sender: 'bot',
                type: 'text'
            };
            setMessages(prev => [...prev, botMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    // Start the escalation by asking for contact info first
    const startEscalationFlow = (reason: string) => {
        pendingEscalationReason.current = reason;
        setEscalationStep('ask_contact');
        const botMsg: Message = {
            id: Date.now().toString(),
            text: 'No worries! To connect you with our support team, please share your **phone number or email address** so we can reach you. 📞',
            sender: 'bot',
            type: 'text'
        };
        setMessages(prev => [...prev, botMsg]);
    };

    const handleSend = (textOverride?: string) => {
        const messageText = textOverride || input;
        if (!messageText.trim() || isTyping) return;

        // If we're waiting for contact info for escalation, intercept
        if (escalationStep === 'ask_contact') {
            const userMsg: Message = {
                id: Date.now().toString(),
                text: messageText,
                sender: 'user'
            };
            setMessages(prev => [...prev, userMsg]);
            if (!textOverride) setInput('');
            sendEscalation(messageText);
            return;
        }

        setIsTyping(true);

        const userMsg: Message = {
            id: Date.now().toString(),
            text: messageText,
            sender: 'user'
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textOverride) setInput('');
        
        processBotResponse(messageText);
        analytics.trackEvent('chat_message_sent', { text: messageText });
    };

    const handleOptionClick = (value: string) => {
        // Escalation special route — collect contact info first
        if (value === '__escalate__') {
            const userMsg: Message = {
                id: Date.now().toString(),
                text: '🆘 Speak to Support',
                sender: 'user'
            };
            setMessages(prev => [...prev, userMsg]);
            startEscalationFlow('Customer clicked Speak to Support');
            analytics.trackEvent('chat_escalated');
            return;
        }

        // Option values are now plain text sent directly to AI
        if (value.startsWith('select_product_')) {
            const productId = value.replace('select_product_', '');
            const product = products.find(p => p.id === productId);
            if (product) {
                navigate(`/product/${product.slug}`);
                setIsOpen(false);
            }
            return;
        }

        handleSend(value);
    };

    const formatMessageText = (text: string) => {
        if (!text) return '';
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const trimmed = line.trim();
            // Check if bullet point (e.g. * Item or - Item)
            const isBullet = trimmed.startsWith('*') || trimmed.startsWith('-');
            let cleanLine = line;
            if (isBullet) {
                // Find first non-bullet character index
                const startIdx = trimmed.search(/[^*-\s]/);
                cleanLine = startIdx !== -1 ? trimmed.substring(startIdx) : trimmed.replace(/^[*\-\s]+/, '');
            }

            // Simple regex parser for bold text (**text**)
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            const boldRegex = /\*\*([^*]+)\*\*/g;
            let match;

            while ((match = boldRegex.exec(cleanLine)) !== null) {
                const before = cleanLine.substring(lastIndex, match.index);
                const boldText = match[1];
                if (before) parts.push(before);
                parts.push(<strong key={match.index} className="font-extrabold text-[#2D1B4E]">{boldText}</strong>);
                lastIndex = boldRegex.lastIndex;
            }
            const after = cleanLine.substring(lastIndex);
            if (after) parts.push(after);

            const content = parts.length > 0 ? parts : cleanLine;

            if (isBullet) {
                return (
                    <div key={index} className="flex items-start gap-1.5 ml-2 my-1">
                        <span className="text-[#b5128f] font-bold select-none mt-0.5">•</span>
                        <span className="flex-1 whitespace-pre-wrap text-[#2D1B4E]">{content}</span>
                    </div>
                );
            }

            return (
                <div key={index} className={`whitespace-pre-wrap ${index > 0 ? 'mt-1.5' : ''}`}>
                    {content}
                </div>
            );
        });
    };

    return (
        <>
            {/* WhatsApp Floating Call Button */}
            <a
                href="https://wa.me/918807829183"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-[145px] md:bottom-[92px] right-6 md:right-8 z-[90] w-[52px] h-[52px] md:w-[60px] md:h-[60px] transition-all duration-300 hover:scale-110 active:scale-95 group"
            >
                <div className="w-full h-full flex items-center justify-center drop-shadow-xl">
                    <svg viewBox="0 0 24 24" fill="#25D366" className="w-full h-full drop-shadow-lg transition-transform group-hover:scale-110">
                        <circle cx="12" cy="12" r="10" fill="white" />
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                    </svg>
                </div>
            </a>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-[80px] md:bottom-6 right-6 md:right-8 z-[90] p-0.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group flex items-center justify-center overflow-hidden
          ${isOpen ? 'bg-[#2D1B4E] rotate-90' : 'bg-[#b5128f]'}`}
            >
                {isOpen ? (
                    <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-[#2D1B4E]">
                        <X className="text-white" size={24} />
                    </div>
                ) : (
                    <img src="/thozhi-avatar.png" alt="Thozhi AI" className="w-12 h-12 md:w-14 md:h-14 object-cover" />
                )}
            </button>

            {/* Proactive Teaser Bubble (Step 1 & 8) */}
            <div 
                className={`fixed bottom-[145px] md:bottom-[92px] right-6 md:right-8 z-[85] max-w-[280px] md:max-w-[320px] transition-all duration-500 transform
                    ${showTeaser ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
            >
                <div 
                    onClick={() => { setIsOpen(true); setShowTeaser(false); }}
                    className="bg-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#b5128f]/10 cursor-pointer hover:shadow-[0_15px_35px_rgba(181,18,143,0.15)] group relative"
                >
                    <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100">
                            <img src="/thozhi-avatar.png" alt="Thozhi AI" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[13px] font-medium text-[#2D1B4E] leading-relaxed group-hover:text-[#b5128f] transition-colors">
                            {teaserText}
                        </p>
                    </div>
                    {/* Tiny close button for the teaser */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-100"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Chat Window */}
            <div className={`fixed bottom-[150px] md:bottom-[92px] right-6 md:right-8 z-[90] w-[90vw] md:w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100/50 overflow-hidden flex flex-col transition-all duration-500 origin-bottom-right
        ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-20 pointer-events-none'}`}
                style={{ height: '70vh', maxHeight: '650px' }}
            >
                {/* Header */}
                <div className="bg-white p-4 flex items-center gap-3 border-b border-gray-100 shadow-sm relative z-10">
                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-md border border-gray-100">
                        <img src="/thozhi-avatar.png" alt="Thozhi AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[#2D1B4E] font-bold text-base tracking-tight">Thozhi AI</h3>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-gray-500 text-[10px] font-medium">Assistant Online</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#FDFCFE] custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isLastBot = msg.sender === 'bot' && index === messages.length - 1;
                            const domain = msg.products?.length ? (msg.products[0].category?.toLowerCase() || 'general') : 'general';
                            const suggestions = QUICK_REPLIES[domain.includes('gift') ? 'gifts' : (domain.includes('food') || domain.includes('mix') ? 'food' : (domain.includes('jewel') ? 'jewellery' : 'general'))];

                            return (
                                <motion.div 
                                    key={msg.id} 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    ref={el => messageRefs.current[msg.id] = el}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                                        ${msg.sender === 'user'
                                            ? 'bg-[#b5128f] text-white rounded-tr-none shadow-md'
                                            : 'bg-white text-[#2D1B4E] border border-gray-100 rounded-tl-none shadow-sm font-medium'
                                        }`}
                                    >
                                        <div className="relative">
                                            {msg.sender === 'bot' && index === 0 && (
                                                <div className="flex items-center gap-1.5 mb-2 text-[#b5128f] text-[10px] uppercase tracking-wider font-bold">
                                                    <Sparkles size={10} />
                                                    <span>Verified Traditional Recommendation</span>
                                                </div>
                                            )}
                                            {formatMessageText(msg.text)}
                                        </div>

                                        {msg.type === 'product-list' && msg.products && (
                                            <div className="mt-5 space-y-3">
                                                {msg.products.map(product => (
                                                    <motion.div
                                                        key={product.id}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="block bg-[#F8F9FA] rounded-xl p-3 hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 group cursor-pointer"
                                                        onClick={() => handleOptionClick(`select_product_${product.id}`)}
                                                    >
                                                        <div className="flex gap-4 items-center">
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-bold text-[#2D1B4E] truncate group-hover:text-[#b5128f] transition-colors">{product.name}</p>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <p className="text-[12px] text-[#b5128f] font-bold">
                                                                        ₹{Number(product.price).toLocaleString('en-IN')}
                                                                    </p>
                                                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#b5128f] transform group-hover:translate-x-1 transition-all" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        {isLastBot && suggestions && (
                                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                                                {suggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        onClick={() => handleSend(suggestion)}
                                                        className="text-[11px] bg-[#FDFCFE] hover:bg-[#b5128f] hover:text-white text-[#b5128f] font-bold py-1.5 px-3 rounded-full transition-all border border-[#b5128f]/20 hover:border-[#b5128f] shadow-sm active:scale-95"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {msg.type === 'options' && msg.options && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {msg.options.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => handleOptionClick(opt.value)}
                                                        className="text-[10px] bg-gray-100 hover:bg-[#b5128f] hover:text-white text-gray-700 font-bold py-1.5 px-3 rounded-full transition-colors border border-gray-200"
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        {isTyping && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-2 justify-start"
                            >
                                <div className="text-[10px] text-gray-400 font-medium ml-4 animate-pulse">
                                    {typingText}
                                </div>
                                <div className="bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-flex w-fit">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="w-1.5 h-1.5 bg-[#b5128f] rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-[#b5128f] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-1.5 h-1.5 bg-[#b5128f] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 focus-within:border-[#b5128f] focus-within:bg-white focus-within:shadow-md transition-all duration-300">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your message..."
                            disabled={isTyping}
                            className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm placeholder:text-gray-400 disabled:opacity-50"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            className="p-2 rounded-lg bg-[#b5128f] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8E2A8B] transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#b5128f]/20"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatWidget;
