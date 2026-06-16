import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HeroSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const slides: {
        image: string;
        mobileImage: string;
        alt: string;
        link: string;
        title?: string;
        titleAccent?: string;
        subtitle?: string;
        buttonText?: string;
        showTextOverlay?: boolean;
    }[] = [
            {
                image: '/hero.webp',
                mobileImage: '/hero.webp',
                alt: 'Handcrafted Terracotta Jewellery',
                link: '/category/handmade-jewellery'
            },
            {
                image: '/kottravai-banner.webp',
                mobileImage: '/kottravai-banner.webp',
                alt: 'Kottravai Banner',
                link: '/category/all',
                showTextOverlay: false
            },
            {
                image: '/uploads/2026/01/banner-2.webp',
                mobileImage: '/uploads/2026/01/banner-2.webp',
                alt: 'Crafted from Coconut',
                link: '/category/coconut-shell-products',
                showTextOverlay: false
            }
        ];

    const nextSlide = () => {
        setCurrentIndex((prev: number) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev: number) => (prev - 1 + slides.length) % slides.length);
    };

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section 
            className="relative w-full overflow-hidden bg-white group hero-section-container"
        >
            <div className="w-full relative h-0" style={{ paddingBottom: '54.375%' }}>
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 w-full h-full ${isLoaded ? 'transition-opacity duration-1000 ease-in-out' : ''} ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                    <a href={slide.link} className="block w-full h-full">
                        <picture>
                            <source 
                                media="(max-width: 768px)" 
                                srcSet={slide.mobileImage}
                                width={1920}
                                height={1044}
                            />
                            <img
                                src={slide.image}
                                alt={slide.alt}
                                width={1920}
                                height={1044}
                                className="w-full h-full object-cover"
                                // First slide = LCP element: eager + high priority
                                loading={index === 0 ? 'eager' : 'lazy'}
                                // @ts-ignore - fetchpriority is a valid attribute but types might be missing
                                fetchpriority={index === 0 ? 'high' : 'low'}
                                decoding={index === 0 ? 'sync' : 'async'}
                            />
                        </picture>
                    </a>
                    {slide.showTextOverlay && (
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-20 pointer-events-auto">
                                <div className="max-w-xl space-y-3 sm:space-y-4 md:space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#3d2419] leading-tight text-shadow-sm">
                                            {slide.title}
                                        </h2>
                                        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#3d2419] leading-tight text-shadow-sm">
                                            {slide.titleAccent}
                                        </h2>
                                    </div>
                                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#3d2419]/90 max-w-md font-medium">
                                        {slide.subtitle}
                                    </p>
                                    <div className="pt-2 md:pt-4">
                                        <a
                                            href={slide.link}
                                            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-[#3d2419] text-white rounded font-medium hover:bg-[#2a1811] transition-all transform hover:-translate-y-1 shadow-lg"
                                        >
                                            <span className="text-sm sm:text-base">{slide.buttonText}</span>
                                            <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Navigation Arrows */}
            <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); prevSlide(); }}
                aria-label="Previous slide"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/30 backdrop-blur-sm text-[#2D1B4E] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-20"
            >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); nextSlide(); }}
                aria-label="Next slide"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/30 backdrop-blur-sm text-[#2D1B4E] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-20"
            >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`transition-all duration-300 rounded-full h-1.5 sm:h-2 ${index === currentIndex ? 'bg-[#3d2419] w-6 sm:w-8' : 'bg-[#3d2419]/20 w-1.5 sm:w-2'
                            }`}
                    />
                ))}
            </div>
            </div>
        </section>
    );
};

export default HeroSlider;
