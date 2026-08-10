
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

export interface EventCardProps {
    title: string;
    subtitle?: string;
    organizer?: string;
    description: string;
    image: string;
    date: string;
    location?: string;
    deadline?: string;
    link: string;
    isActive?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
    title,
    subtitle,
    organizer,
    description,
    image,
    date,
    location,
    deadline,
    link,
    isActive = true
}) => {
    return (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full group">
            <div className="relative h-64 overflow-hidden">
                <img 
                    src={image} 
                    alt={title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                {!isActive && (
                    <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                        Closed
                    </div>
                )}
            </div>
            
            <div className="p-6 md:p-8 flex flex-col flex-grow">
                {subtitle && (
                    <p className="text-[#8E2A8B] font-bold text-sm tracking-wide uppercase mb-2">
                        {subtitle}
                    </p>
                )}
                
                <h3 className="text-2xl font-black text-[#2D1B4E] mb-3 leading-tight">
                    {title}
                </h3>

                {organizer && (
                    <p className="text-gray-500 text-sm mb-4 font-medium">
                        {organizer}
                    </p>
                )}
                
                <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">
                    {description}
                </p>
                
                <div className="mt-auto space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                        <Calendar size={18} className="text-[#8E2A8B]" />
                        <span>{date}</span>
                    </div>
                    {location && (
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                            <MapPin size={18} className="text-[#8E2A8B]" />
                            <span>{location}</span>
                        </div>
                    )}
                    {deadline && (
                        <div className="mt-4 inline-block bg-[#8E2A8B]/10 text-[#8E2A8B] px-3 py-1.5 rounded-lg text-xs font-bold">
                            Registration deadline: {deadline}
                        </div>
                    )}
                </div>
                
                <Link 
                    to={link}
                    className="w-full py-3 px-6 rounded-xl border-2 border-[#8E2A8B] text-[#8E2A8B] font-bold text-center hover:bg-[#8E2A8B] hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
                >
                    Explore Event <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
};

export default EventCard;
