/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ConcurrencyTestModal } from './components/ConcurrencyTestModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AttendeeDashboard } from './pages/AttendeeDashboard';

export default function App() {
  const [concurrencyModalOpen, setConcurrencyModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-violet-500 selection:text-white">
          <Navbar onOpenConcurrencyModal={() => setConcurrencyModalOpen(true)} />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/checkout/:reservationId" element={<CheckoutPage />} />
              <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/attendee" element={<AttendeeDashboard />} />
            </Routes>
          </main>

          <Footer />

          {/* Interactive Concurrency Benchmark Modal (Section 13) */}
          <ConcurrencyTestModal
            isOpen={concurrencyModalOpen}
            onClose={() => setConcurrencyModalOpen(false)}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
