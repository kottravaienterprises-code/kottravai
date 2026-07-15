import { Link } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { Helmet } from 'react-helmet-async';

const NotFound = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Page Not Found - Kottravai</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 bg-gradient-to-b from-[#fbf9ff] to-white">
                <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2D1B4E] to-[#8E2A8B] animate-pulse">404</h1>
                <h2 className="text-3xl font-black text-[#2D1B4E] mt-4 tracking-tight">Oops! Page Not Found</h2>
                <p className="text-gray-500 mt-2 mb-8 max-w-md font-medium text-sm">
                    The link you followed may be broken, or the page has been moved. Explore our beautiful handcrafted catalog instead!
                </p>
                <div className="flex gap-4">
                    <Link
                        to="/shop"
                        className="bg-[#2D1B4E] hover:bg-[#1a1030] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
                    >
                        Explore Shop
                    </Link>
                    <Link
                        to="/"
                        className="border-2 border-[#2D1B4E] text-[#2D1B4E] hover:bg-[#2D1B4E]/5 px-8 py-3 rounded-full font-bold transition-all duration-300 text-sm"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </MainLayout>
    );
};

export default NotFound;
