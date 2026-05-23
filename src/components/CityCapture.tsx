'use client';
import { useState } from 'react';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot',
  'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Gandhinagar', 'Anand', 'Nadiad'
];

export default function CityCapture({ value, onChange }: { value: string; onChange: (city: string) => void }) {
  const [customCity, setCustomCity] = useState('');

  return (
    <div className="mb-4">
      <label className="block text-sm text-white/60 mb-2">Your City *</label>
      <select
        value={value}
        onChange={(e) => { if (e.target.value === 'other') return; onChange(e.target.value); }}
        className="w-full p-2 bg-white/10 rounded text-white mb-2"
      >
        <option value="">Select City</option>
        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="other">Other (type below)</option>
      </select>
      {value === 'other' && (
        <input
          type="text"
          placeholder="Enter your city"
          value={customCity}
          onChange={(e) => { setCustomCity(e.target.value); onChange(e.target.value); }}
          className="w-full p-2 bg-white/10 rounded text-white"
        />
      )}
    </div>
  );
}
