import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Image as ImageIcon, MessageSquare, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Product } from '@/data/products';

export interface CustomizationData {
    isCustomized: boolean;
    customText?: string;
    customImage?: string; // Base64 data URL
    specialInstructions?: string;
    customizationCharge: number;
}

interface ProductCustomizationProps {
    product: Product;
    onCustomizationChange: (data: CustomizationData) => void;
}

const ProductCustomization: React.FC<ProductCustomizationProps> = ({ product, onCustomizationChange }) => {
    const [isCustomized, setIsCustomized] = useState(false);
    const [customText, setCustomText] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [customImage, setCustomImage] = useState<string | undefined>(undefined);
    const [imageName, setImageName] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        isCustomizable,
        customizationCharge = 100,
        allowImageUpload = false,
        allowCustomText = false,
        allowSpecialInstructions = false,
        maxTextLength = 50,
        maxFileSize = 5,
        allowedFileTypes = ['JPG', 'JPEG', 'PNG', 'WEBP'],
        customizationType = 'No Restrictions'
    } = product;

    // Determine what fields to show based on customizationType
    const showImageUpload = allowImageUpload && ['Image Upload', 'Image + Text', 'Image Only', 'No Restrictions'].includes(customizationType);
    const showCustomText = allowCustomText && ['Custom Text', 'Image + Text', 'Text Only', 'No Restrictions'].includes(customizationType);
    const showSpecialInstructions = allowSpecialInstructions && ['Special Instructions', 'No Restrictions'].includes(customizationType);

    useEffect(() => {
        onCustomizationChange({
            isCustomized,
            customText: showCustomText ? customText : undefined,
            customImage: showImageUpload ? customImage : undefined,
            specialInstructions: showSpecialInstructions ? specialInstructions : undefined,
            customizationCharge: isCustomized ? customizationCharge : 0,
        });
    }, [isCustomized, customText, customImage, specialInstructions, showCustomText, showImageUpload, showSpecialInstructions, customizationCharge, onCustomizationChange]);

    if (!isCustomizable) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate File Size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxFileSize) {
            setError(`File size must be less than ${maxFileSize}MB.`);
            return;
        }

        // Validate File Type
        const fileExtension = file.name.split('.').pop()?.toUpperCase() || '';
        const isValidType = allowedFileTypes.some(type => 
            type.replace('.', '').toUpperCase() === fileExtension
        );
        
        if (!isValidType) {
            setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`);
            return;
        }

        // Convert to Base64 for preview and local storage compatibility
        try {
            // Compress image to prevent localStorage QuotaExceededError (Max 5MB)
            const options = {
                maxSizeMB: 0.1, // Compress to max 100KB
                maxWidthOrHeight: 800,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                if (!reader.result) {
                    setError("Failed to read file or corrupted image.");
                    return;
                }
                setCustomImage(reader.result as string);
                setImageName(file.name);
            };
            reader.onerror = () => {
                setError("Failed to read file or corrupted image.");
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error("Compression error:", error);
            setError("Failed to compress image. Please use a smaller image.");
        }
    };

    const clearImage = () => {
        setCustomImage(undefined);
        setImageName(undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="mt-8 mb-6 border border-[#E9E4DB] rounded-2xl overflow-hidden bg-[#FAF9F6]">
            {/* Toggle Header */}
            <div 
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isCustomized ? 'bg-[#2D1B4E] text-white' : 'hover:bg-[#F3F0EA]'}`}
                onClick={() => setIsCustomized(!isCustomized)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                        <span className="text-xl">✨</span>
                    </div>
                    <div>
                        <h4 className={`font-black text-sm md:text-base ${isCustomized ? 'text-white' : 'text-[#2D1B4E]'}`}>
                            CUSTOMIZE THIS PRODUCT
                        </h4>
                        <p className={`text-xs ${isCustomized ? 'text-white/80' : 'text-gray-500'}`}>
                            + ₹{customizationCharge} per product configuration
                        </p>
                    </div>
                </div>
                
                <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${isCustomized ? 'bg-[#8E2A8B]' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${isCustomized ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </div>

            {/* Customization Form */}
            {isCustomized && (
                <div className="p-5 space-y-5">
                    {/* Error Alert */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Image Upload */}
                    {showImageUpload && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-[#2D1B4E] uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={14} className="text-[#8E2A8B]" />
                                Upload Custom Image
                            </label>
                            
                            {!customImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-[#8E2A8B] hover:bg-[#8E2A8B]/5 transition-colors cursor-pointer"
                                >
                                    <Upload size={24} className="text-gray-400" />
                                    <p className="text-sm font-medium text-gray-600">Click to upload image</p>
                                    <p className="text-[10px] text-gray-400">Max {maxFileSize}MB ({allowedFileTypes.join(', ')})</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                            <img src={customImage} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{imageName}</p>
                                            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                                <Check size={10} /> Uploaded Successfully
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={clearImage}
                                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                accept={allowedFileTypes.map(t => `.${t.toLowerCase()}`).join(',')}
                                onChange={handleImageUpload}
                            />
                        </div>
                    )}

                    {/* Custom Text */}
                    {showCustomText && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-[#2D1B4E] uppercase tracking-widest flex items-center gap-2 justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="text-[#8E2A8B]">T</span>
                                    Custom Text
                                </span>
                                <span className={`text-[10px] font-medium ${customText.length > maxTextLength ? 'text-red-500' : 'text-gray-400'}`}>
                                    {customText.length} / {maxTextLength}
                                </span>
                            </label>
                            <input
                                type="text"
                                value={customText}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomText(val);
                                    
                                    // Validation for emojis and unsupported characters
                                    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
                                    
                                    if (emojiRegex.test(val)) {
                                        setError('Emojis and special characters are not supported for custom text.');
                                    } else if (val.trim() === '' && val.length > 0) {
                                        setError('Custom text cannot be just spaces.');
                                    } else {
                                        setError(null);
                                    }
                                }}
                                maxLength={maxTextLength}
                                placeholder="Enter your text here..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E2A8B] focus:ring-1 focus:ring-[#8E2A8B] transition-all"
                            />
                        </div>
                    )}

                    {/* Special Instructions */}
                    {showSpecialInstructions && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-[#2D1B4E] uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={14} className="text-[#8E2A8B]" />
                                Special Instructions (Optional)
                            </label>
                            <textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                placeholder="Any specific details we should know?"
                                rows={3}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E2A8B] focus:ring-1 focus:ring-[#8E2A8B] transition-all resize-none"
                            />
                        </div>
                    )}
                    
                    {/* Customization Summary Card */}
                    {(customText || customImage || specialInstructions) && (
                        <div className="pt-4 mt-2 border-t border-gray-200">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <h4 className="text-xs font-black text-[#2D1B4E] uppercase tracking-widest mb-3 border-b border-gray-100 pb-2 flex items-center justify-between">
                                    <span>Customization Summary</span>
                                    <span className="bg-purple-100 text-[#8E2A8B] px-2 py-0.5 rounded-full text-[9px]">Reviewing</span>
                                </h4>
                                
                                <div className="space-y-3 mb-4">
                                    {customImage && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">Image:</span>
                                            <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden">
                                                <img src={customImage} alt="Uploaded Preview" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                    {customText && (
                                        <div className="flex items-start gap-3">
                                            <span className="text-xs text-gray-500 w-24 flex-shrink-0 mt-0.5">Text:</span>
                                            <span className="text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100 break-all">{customText}</span>
                                        </div>
                                    )}
                                    {specialInstructions && (
                                        <div className="flex items-start gap-3">
                                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">Notes:</span>
                                            <span className="text-xs font-medium text-gray-700 italic bg-yellow-50 px-2 py-1 rounded border border-yellow-100 break-words">{specialInstructions}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1 mb-4">
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Product Base Price:</span>
                                        <span>₹{product.price}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-[#8E2A8B] font-medium">
                                        <span>Customization Charge (One-time):</span>
                                        <span>+ ₹{customizationCharge}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-black text-[#2D1B4E] pt-1 mt-1 border-t border-gray-200">
                                        <span>Total Configuration Price:</span>
                                        <span>₹{product.price + customizationCharge}</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                                        <Check size={12} /> Your customization details will be reviewed by our production team before processing.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        <div className="bg-white p-2 rounded border border-emerald-50">
                                            <p className="text-[9px] text-gray-500 uppercase font-bold">Standard Delivery</p>
                                            <p className="text-xs font-black text-gray-800">3 - 5 Days</p>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-emerald-50">
                                            <p className="text-[9px] text-gray-500 uppercase font-bold">Customization Processing</p>
                                            <p className="text-xs font-black text-[#8E2A8B]">2 - 4 Days</p>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-emerald-50 md:col-span-2">
                                            <p className="text-[9px] text-gray-500 uppercase font-bold">Estimated Total Delivery</p>
                                            <p className="text-sm font-black text-emerald-700">5 - 9 Business Days</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductCustomization;
