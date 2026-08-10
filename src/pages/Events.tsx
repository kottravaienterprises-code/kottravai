
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import EventCard from '@/components/events/EventCard';

const Events = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Events & Gatherings | Kottravai</title>
                <meta name="description" content="Discover upcoming events, workshops, and camps hosted by Kottravai." />
            </Helmet>

            {/* Hero Section */}
            <div className="w-full">
                <img 
                    src="/ChatGPT%20Image%20Aug%208,%202026,%2009_01_01%20PM.png" 
                    alt="Events and Gatherings" 
                    className="w-full h-auto block"
                />
            </div>

            {/* Events Grid */}
            <div id="events-grid" className="bg-gray-50 min-h-screen py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        
                        {/* Event 1: Design the Next Livelihood */}
                        <EventCard 
                            title="Design the Next Livelihood"
                            subtitle="India's Sustainable Livelihood Design Challenge 2026"
                            organizer="Organized by: Kottravai × Luxentra | Collab: Startup Singam"
                            description="From unhealthy work and limited choices to dignified work, fair income, and brighter futures. Design with nature's resources like Coconut Shell, Banana Fibre, Terracotta, and more."
                            image="/f75068b6-ef82-446b-9bf7-998f3b9e32a3.png" 
                            date="To be announced"
                            deadline="August 25"
                            link="/livelihood-challenge"
                            isActive={true}
                        />

                        {/* Event 2: Camps (Existing) */}
                        <EventCard 
                            title="மண் வாசம் (Man Vaasam) Camp"
                            subtitle="Nature Immersive Experience"
                            organizer="Kottravai"
                            description="A grounded, immersive experience of nature, community, and mindful living. Join us to disconnect from the noise and reconnect with your roots."
                            image="/images/nature_camp_banner.png"
                            date="Upcoming Dates TBA"
                            location="Kottravai Farm / Campus"
                            link="/camps"
                            isActive={true}
                        />

                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default Events;
