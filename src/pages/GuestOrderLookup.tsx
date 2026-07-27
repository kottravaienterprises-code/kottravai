import { useState } from 'react';
import { useGuestAuth } from '../contexts/GuestAuthContext';
import GuestCheckoutModal from '../components/GuestCheckoutModal';

import { Helmet } from 'react-helmet-async';

export const GuestOrderLookup = () => {
  const { isAuthenticated, profile } = useGuestAuth();
  const [isModalOpen, setIsModalOpen] = useState(!isAuthenticated);

  return (
    <div className="container mx-auto p-4">
      <Helmet>
        <title>Track Your Order - Kottravai</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="text-3xl font-bold mb-6">Track Your Order</h1>
      
      {!isAuthenticated ? (
        <div>
          <p>Please verify your phone number to view your orders.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 bg-blue-600 text-white p-2 rounded">
            Verify Phone
          </button>
          <GuestCheckoutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
        </div>
      ) : (
        <div>
          <p className="mb-4">Showing orders for: {profile?.phone}</p>
          <div className="bg-white shadow rounded p-4 border">
            {/* Mock Order */}
            <div className="flex justify-between border-b pb-2 mb-2">
              <span className="font-semibold">Order #ORD-10294</span>
              <span className="text-green-600 font-medium">Delivered</span>
            </div>
            <div className="text-sm text-gray-600">Date: Oct 24, 2023</div>
            <div className="text-sm font-medium mt-2">Total: ₹1,299</div>
          </div>
        </div>
      )}
    </div>
  );
};
