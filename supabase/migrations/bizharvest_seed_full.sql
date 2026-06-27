-- ============================================================
-- BizHarvest Targets — Full Seed
-- Sourced from: src/lib/scrapers/free-sources.ts (CITIES + CATEGORIES)
-- Run AFTER bizharvest_targets.sql migration
-- ============================================================
-- Priority scale: 10 = Tier 1 city / highest-ROI category
--                  8 = Tier 2 major
--                  6 = Tier 2 growing
--                  4 = Tier 3 MSME clusters
-- ============================================================

-- Wipe previous default seed so this one takes over cleanly
DELETE FROM bizharvest_targets;

INSERT INTO bizharvest_targets (city, business_type, priority) VALUES

-- ════════════════════════════════════════════════════════════
--  FOOD & BEVERAGE — high WhatsApp volume, low ticket, fast reply
-- ════════════════════════════════════════════════════════════

-- restaurant — Tier 1
('Mumbai','restaurant',10),('Delhi','restaurant',10),('Bangalore','restaurant',10),
('Hyderabad','restaurant',10),('Chennai','restaurant',10),('Kolkata','restaurant',10),
('Pune','restaurant',10),('Ahmedabad','restaurant',10),
-- restaurant — Tier 2 major
('Jaipur','restaurant',8),('Surat','restaurant',8),('Lucknow','restaurant',8),
('Kanpur','restaurant',8),('Nagpur','restaurant',8),('Indore','restaurant',8),
('Bhopal','restaurant',8),('Visakhapatnam','restaurant',8),('Patna','restaurant',8),
('Vadodara','restaurant',8),('Ludhiana','restaurant',8),('Agra','restaurant',8),
('Nashik','restaurant',8),('Rajkot','restaurant',8),('Varanasi','restaurant',8),
('Aurangabad','restaurant',8),('Amritsar','restaurant',8),('Coimbatore','restaurant',8),
('Thane','restaurant',8),('Howrah','restaurant',8),
-- restaurant — Tier 2 growing
('Chandigarh','restaurant',6),('Kochi','restaurant',6),('Mysuru','restaurant',6),
('Jodhpur','restaurant',6),('Raipur','restaurant',6),('Ranchi','restaurant',6),
('Guwahati','restaurant',6),('Madurai','restaurant',6),('Vijayawada','restaurant',6),
('Bhubaneswar','restaurant',6),('Jamshedpur','restaurant',6),('Siliguri','restaurant',6),
('Goa','restaurant',6),('Mangaluru','restaurant',6),('Udaipur','restaurant',6),
-- restaurant — Tier 3
('Noida','restaurant',4),('Gurugram','restaurant',4),('Dehradun','restaurant',4),
('Haridwar','restaurant',4),('Gandhinagar','restaurant',4),('Hubli','restaurant',4),
('Thrissur','restaurant',4),('Kolhapur','restaurant',4),('Ajmer','restaurant',4),

-- cafe
('Mumbai','cafe',9),('Delhi','cafe',9),('Bangalore','cafe',9),('Pune','cafe',9),
('Hyderabad','cafe',8),('Chennai','cafe',8),('Kolkata','cafe',7),('Ahmedabad','cafe',7),
('Jaipur','cafe',7),('Chandigarh','cafe',7),('Kochi','cafe',7),('Indore','cafe',6),
('Vadodara','cafe',6),('Surat','cafe',6),('Noida','cafe',5),('Gurugram','cafe',5),
('Mysuru','cafe',5),('Dehradun','cafe',5),('Goa','cafe',6),

-- bakery
('Mumbai','bakery',8),('Delhi','bakery',8),('Bangalore','bakery',8),('Pune','bakery',7),
('Hyderabad','bakery',7),('Chennai','bakery',7),('Kolkata','bakery',7),('Ahmedabad','bakery',6),
('Jaipur','bakery',6),('Chandigarh','bakery',6),('Kochi','bakery',6),('Surat','bakery',5),
('Vadodara','bakery',5),('Nagpur','bakery',5),('Lucknow','bakery',5),

-- catering
('Mumbai','catering',8),('Delhi','catering',8),('Bangalore','catering',7),
('Hyderabad','catering',7),('Chennai','catering',7),('Pune','catering',7),
('Kolkata','catering',7),('Ahmedabad','catering',6),('Jaipur','catering',6),
('Lucknow','catering',6),('Chandigarh','catering',5),('Vadodara','catering',5),
('Surat','catering',5),('Patna','catering',5),('Ranchi','catering',4),

-- cloud kitchen
('Mumbai','cloud kitchen',8),('Delhi','cloud kitchen',8),('Bangalore','cloud kitchen',9),
('Hyderabad','cloud kitchen',8),('Chennai','cloud kitchen',7),('Pune','cloud kitchen',8),
('Kolkata','cloud kitchen',7),('Ahmedabad','cloud kitchen',7),('Noida','cloud kitchen',6),
('Gurugram','cloud kitchen',6),('Surat','cloud kitchen',5),('Vadodara','cloud kitchen',5),

-- tiffin service
('Mumbai','tiffin service',8),('Delhi','tiffin service',7),('Pune','tiffin service',8),
('Bangalore','tiffin service',7),('Hyderabad','tiffin service',7),('Chennai','tiffin service',6),
('Ahmedabad','tiffin service',7),('Surat','tiffin service',7),('Vadodara','tiffin service',6),
('Nagpur','tiffin service',6),('Lucknow','tiffin service',6),('Patna','tiffin service',5),
('Bhopal','tiffin service',5),('Indore','tiffin service',6),('Kanpur','tiffin service',5),

-- ════════════════════════════════════════════════════════════
--  HEALTHCARE — high ticket, WhatsApp appointment booking gold
-- ════════════════════════════════════════════════════════════

-- clinic
('Mumbai','clinic',10),('Delhi','clinic',10),('Bangalore','clinic',10),
('Hyderabad','clinic',10),('Chennai','clinic',10),('Kolkata','clinic',10),
('Pune','clinic',10),('Ahmedabad','clinic',10),('Jaipur','clinic',9),
('Surat','clinic',9),('Lucknow','clinic',9),('Kanpur','clinic',8),
('Nagpur','clinic',8),('Indore','clinic',8),('Bhopal','clinic',8),
('Visakhapatnam','clinic',8),('Patna','clinic',8),('Vadodara','clinic',8),
('Ludhiana','clinic',8),('Agra','clinic',7),('Nashik','clinic',7),
('Rajkot','clinic',7),('Varanasi','clinic',7),('Aurangabad','clinic',7),
('Amritsar','clinic',7),('Coimbatore','clinic',7),('Thane','clinic',7),
('Chandigarh','clinic',7),('Kochi','clinic',7),('Mysuru','clinic',6),
('Jodhpur','clinic',6),('Ranchi','clinic',6),('Guwahati','clinic',6),
('Madurai','clinic',6),('Vijayawada','clinic',6),('Bhubaneswar','clinic',6),
('Jamshedpur','clinic',6),('Goa','clinic',5),('Mangaluru','clinic',5),
('Noida','clinic',6),('Gurugram','clinic',7),('Dehradun','clinic',5),
('Udaipur','clinic',5),('Thrissur','clinic',5),('Hubli','clinic',5),

-- hospital
('Mumbai','hospital',10),('Delhi','hospital',10),('Bangalore','hospital',10),
('Hyderabad','hospital',10),('Chennai','hospital',10),('Kolkata','hospital',10),
('Pune','hospital',10),('Ahmedabad','hospital',10),('Jaipur','hospital',9),
('Surat','hospital',9),('Lucknow','hospital',9),('Kanpur','hospital',8),
('Nagpur','hospital',8),('Indore','hospital',8),('Bhopal','hospital',8),
('Visakhapatnam','hospital',8),('Patna','hospital',8),('Vadodara','hospital',8),
('Ludhiana','hospital',8),('Nashik','hospital',7),('Rajkot','hospital',7),
('Varanasi','hospital',7),('Amritsar','hospital',7),('Coimbatore','hospital',7),
('Chandigarh','hospital',7),('Kochi','hospital',7),('Ranchi','hospital',6),
('Guwahati','hospital',6),('Madurai','hospital',6),('Vijayawada','hospital',6),
('Bhubaneswar','hospital',6),('Jamshedpur','hospital',6),('Noida','hospital',7),
('Gurugram','hospital',8),('Dehradun','hospital',5),('Mangaluru','hospital',5),

-- dental clinic
('Mumbai','dental clinic',9),('Delhi','dental clinic',9),('Bangalore','dental clinic',9),
('Hyderabad','dental clinic',8),('Chennai','dental clinic',8),('Pune','dental clinic',8),
('Kolkata','dental clinic',8),('Ahmedabad','dental clinic',8),('Jaipur','dental clinic',7),
('Surat','dental clinic',7),('Lucknow','dental clinic',7),('Vadodara','dental clinic',7),
('Nagpur','dental clinic',7),('Indore','dental clinic',7),('Chandigarh','dental clinic',6),
('Kochi','dental clinic',6),('Coimbatore','dental clinic',6),('Thane','dental clinic',6),
('Noida','dental clinic',6),('Gurugram','dental clinic',7),('Patna','dental clinic',6),
('Bhopal','dental clinic',6),('Ranchi','dental clinic',5),('Amritsar','dental clinic',6),

-- pharmacy
('Mumbai','pharmacy',9),('Delhi','pharmacy',9),('Bangalore','pharmacy',9),
('Hyderabad','pharmacy',8),('Chennai','pharmacy',8),('Pune','pharmacy',8),
('Kolkata','pharmacy',8),('Ahmedabad','pharmacy',8),('Jaipur','pharmacy',7),
('Surat','pharmacy',7),('Lucknow','pharmacy',7),('Vadodara','pharmacy',7),
('Nagpur','pharmacy',7),('Indore','pharmacy',7),('Patna','pharmacy',7),
('Chandigarh','pharmacy',6),('Kochi','pharmacy',6),('Ranchi','pharmacy',6),
('Guwahati','pharmacy',6),('Bhubaneswar','pharmacy',5),

-- diagnostic centre
('Mumbai','diagnostic centre',9),('Delhi','diagnostic centre',9),('Bangalore','diagnostic centre',8),
('Hyderabad','diagnostic centre',8),('Chennai','diagnostic centre',8),('Pune','diagnostic centre',8),
('Kolkata','diagnostic centre',8),('Ahmedabad','diagnostic centre',7),('Jaipur','diagnostic centre',7),
('Surat','diagnostic centre',7),('Lucknow','diagnostic centre',7),('Vadodara','diagnostic centre',6),
('Nagpur','diagnostic centre',6),('Chandigarh','diagnostic centre',6),('Kochi','diagnostic centre',6),
('Patna','diagnostic centre',6),('Noida','diagnostic centre',6),('Gurugram','diagnostic centre',7),

-- skin clinic
('Mumbai','skin clinic',9),('Delhi','skin clinic',9),('Bangalore','skin clinic',9),
('Hyderabad','skin clinic',8),('Chennai','skin clinic',8),('Pune','skin clinic',8),
('Ahmedabad','skin clinic',7),('Jaipur','skin clinic',7),('Surat','skin clinic',7),
('Vadodara','skin clinic',7),('Chandigarh','skin clinic',6),('Noida','skin clinic',6),
('Gurugram','skin clinic',7),('Kochi','skin clinic',6),('Coimbatore','skin clinic',6),

-- eye clinic
('Mumbai','eye clinic',8),('Delhi','eye clinic',8),('Bangalore','eye clinic',8),
('Hyderabad','eye clinic',7),('Chennai','eye clinic',7),('Pune','eye clinic',7),
('Ahmedabad','eye clinic',7),('Jaipur','eye clinic',6),('Surat','eye clinic',6),
('Vadodara','eye clinic',6),('Lucknow','eye clinic',6),('Patna','eye clinic',6),
('Chandigarh','eye clinic',5),('Kochi','eye clinic',5),

-- physiotherapy
('Mumbai','physiotherapy',8),('Delhi','physiotherapy',8),('Bangalore','physiotherapy',8),
('Hyderabad','physiotherapy',7),('Chennai','physiotherapy',7),('Pune','physiotherapy',7),
('Ahmedabad','physiotherapy',7),('Jaipur','physiotherapy',6),('Surat','physiotherapy',6),
('Vadodara','physiotherapy',6),('Chandigarh','physiotherapy',6),('Noida','physiotherapy',6),
('Gurugram','physiotherapy',7),('Kochi','physiotherapy',5),

-- ════════════════════════════════════════════════════════════
--  FITNESS & WELLNESS — strong WhatsApp membership upsell potential
-- ════════════════════════════════════════════════════════════

-- gym
('Mumbai','gym',10),('Delhi','gym',10),('Bangalore','gym',10),
('Hyderabad','gym',9),('Chennai','gym',9),('Pune','gym',10),
('Kolkata','gym',9),('Ahmedabad','gym',9),('Jaipur','gym',8),
('Surat','gym',8),('Lucknow','gym',8),('Nagpur','gym',8),
('Indore','gym',8),('Vadodara','gym',8),('Ludhiana','gym',7),
('Nashik','gym',7),('Rajkot','gym',7),('Amritsar','gym',7),
('Coimbatore','gym',7),('Thane','gym',8),('Chandigarh','gym',7),
('Kochi','gym',7),('Mysuru','gym',6),('Jodhpur','gym',6),
('Ranchi','gym',6),('Guwahati','gym',6),('Madurai','gym',6),
('Vijayawada','gym',6),('Bhubaneswar','gym',6),('Jamshedpur','gym',5),
('Noida','gym',7),('Gurugram','gym',8),('Dehradun','gym',5),
('Udaipur','gym',5),('Hubli','gym',4),

-- yoga studio
('Mumbai','yoga studio',9),('Delhi','yoga studio',9),('Bangalore','yoga studio',9),
('Hyderabad','yoga studio',8),('Pune','yoga studio',9),('Chennai','yoga studio',8),
('Ahmedabad','yoga studio',8),('Jaipur','yoga studio',7),('Chandigarh','yoga studio',7),
('Kochi','yoga studio',7),('Mysuru','yoga studio',7),('Indore','yoga studio',6),
('Vadodara','yoga studio',6),('Surat','yoga studio',6),('Noida','yoga studio',6),
('Gurugram','yoga studio',7),('Dehradun','yoga studio',5),('Rishikesh','yoga studio',8),
('Haridwar','yoga studio',7),('Goa','yoga studio',7),('Coimbatore','yoga studio',6),

-- meditation centre
('Mumbai','meditation centre',7),('Delhi','meditation centre',7),('Bangalore','meditation centre',7),
('Pune','meditation centre',7),('Rishikesh','meditation centre',9),('Haridwar','meditation centre',8),
('Mysuru','meditation centre',6),('Kochi','meditation centre',5),('Goa','meditation centre',6),
('Dharamshala','meditation centre',7),

-- weight loss centre
('Mumbai','weight loss centre',8),('Delhi','weight loss centre',8),('Bangalore','weight loss centre',7),
('Hyderabad','weight loss centre',7),('Pune','weight loss centre',7),('Chennai','weight loss centre',7),
('Ahmedabad','weight loss centre',6),('Jaipur','weight loss centre',6),('Surat','weight loss centre',6),
('Vadodara','weight loss centre',6),('Chandigarh','weight loss centre',5),('Noida','weight loss centre',6),
('Gurugram','weight loss centre',7),

-- ════════════════════════════════════════════════════════════
--  BEAUTY & PERSONAL CARE — repeat customers, WhatsApp booking goldmine
-- ════════════════════════════════════════════════════════════

-- salon
('Mumbai','salon',10),('Delhi','salon',10),('Bangalore','salon',10),
('Hyderabad','salon',9),('Chennai','salon',9),('Pune','salon',10),
('Kolkata','salon',9),('Ahmedabad','salon',9),('Jaipur','salon',8),
('Surat','salon',8),('Lucknow','salon',8),('Nagpur','salon',8),
('Indore','salon',8),('Vadodara','salon',8),('Ludhiana','salon',7),
('Nashik','salon',7),('Rajkot','salon',7),('Amritsar','salon',7),
('Coimbatore','salon',7),('Thane','salon',8),('Chandigarh','salon',7),
('Kochi','salon',7),('Mysuru','salon',6),('Jodhpur','salon',6),
('Ranchi','salon',6),('Guwahati','salon',6),('Madurai','salon',6),
('Vijayawada','salon',6),('Bhubaneswar','salon',6),('Jamshedpur','salon',5),
('Noida','salon',7),('Gurugram','salon',8),('Dehradun','salon',5),
('Udaipur','salon',5),('Hubli','salon',4),

-- beauty parlour
('Mumbai','beauty parlour',9),('Delhi','beauty parlour',9),('Bangalore','beauty parlour',8),
('Hyderabad','beauty parlour',8),('Chennai','beauty parlour',8),('Pune','beauty parlour',8),
('Kolkata','beauty parlour',9),('Ahmedabad','beauty parlour',8),('Jaipur','beauty parlour',7),
('Surat','beauty parlour',7),('Lucknow','beauty parlour',7),('Patna','beauty parlour',7),
('Nagpur','beauty parlour',7),('Vadodara','beauty parlour',7),('Amritsar','beauty parlour',6),
('Chandigarh','beauty parlour',6),('Kochi','beauty parlour',6),('Ludhiana','beauty parlour',6),
('Ranchi','beauty parlour',6),('Guwahati','beauty parlour',5),

-- spa
('Mumbai','spa',9),('Delhi','spa',9),('Bangalore','spa',9),('Hyderabad','spa',8),
('Pune','spa',8),('Chennai','spa',8),('Ahmedabad','spa',7),('Goa','spa',9),
('Jaipur','spa',7),('Kochi','spa',7),('Chandigarh','spa',6),('Gurugram','spa',8),
('Noida','spa',6),('Mysuru','spa',6),('Udaipur','spa',7),('Dehradun','spa',5),

-- makeup artist
('Mumbai','makeup artist',9),('Delhi','makeup artist',9),('Bangalore','makeup artist',8),
('Hyderabad','makeup artist',8),('Chennai','makeup artist',7),('Pune','makeup artist',8),
('Kolkata','makeup artist',8),('Ahmedabad','makeup artist',7),('Jaipur','makeup artist',7),
('Surat','makeup artist',7),('Chandigarh','makeup artist',7),('Lucknow','makeup artist',6),
('Amritsar','makeup artist',6),('Vadodara','makeup artist',6),('Kochi','makeup artist',6),

-- mehendi artist
('Mumbai','mehendi artist',8),('Delhi','mehendi artist',8),('Bangalore','mehendi artist',7),
('Hyderabad','mehendi artist',7),('Jaipur','mehendi artist',9),('Ahmedabad','mehendi artist',8),
('Surat','mehendi artist',8),('Lucknow','mehendi artist',7),('Kanpur','mehendi artist',7),
('Amritsar','mehendi artist',7),('Chandigarh','mehendi artist',6),('Vadodara','mehendi artist',6),
('Patna','mehendi artist',6),('Rajkot','mehendi artist',6),

-- ════════════════════════════════════════════════════════════
--  EDUCATION — high ticket, parent WhatsApp groups = viral
-- ════════════════════════════════════════════════════════════

-- coaching centre
('Mumbai','coaching centre',9),('Delhi','coaching centre',10),('Bangalore','coaching centre',9),
('Hyderabad','coaching centre',9),('Chennai','coaching centre',9),('Pune','coaching centre',9),
('Kolkata','coaching centre',9),('Ahmedabad','coaching centre',8),('Jaipur','coaching centre',9),
('Kota','coaching centre',10),('Lucknow','coaching centre',8),('Kanpur','coaching centre',8),
('Nagpur','coaching centre',8),('Indore','coaching centre',8),('Bhopal','coaching centre',8),
('Visakhapatnam','coaching centre',7),('Patna','coaching centre',8),('Vadodara','coaching centre',7),
('Ludhiana','coaching centre',7),('Agra','coaching centre',7),('Varanasi','coaching centre',7),
('Aurangabad','coaching centre',7),('Amritsar','coaching centre',7),('Coimbatore','coaching centre',7),
('Chandigarh','coaching centre',7),('Kochi','coaching centre',7),('Jodhpur','coaching centre',6),
('Ranchi','coaching centre',7),('Guwahati','coaching centre',6),('Bhubaneswar','coaching centre',6),
('Jamshedpur','coaching centre',6),('Noida','coaching centre',7),('Gurugram','coaching centre',7),
('Dehradun','coaching centre',6),('Siliguri','coaching centre',5),

-- neet coaching
('Delhi','neet coaching',10),('Mumbai','neet coaching',9),('Bangalore','neet coaching',9),
('Hyderabad','neet coaching',9),('Chennai','neet coaching',9),('Pune','neet coaching',8),
('Kota','neet coaching',10),('Ahmedabad','neet coaching',8),('Jaipur','neet coaching',8),
('Coimbatore','neet coaching',8),('Lucknow','neet coaching',7),('Patna','neet coaching',7),
('Chandigarh','neet coaching',7),('Nagpur','neet coaching',7),('Indore','neet coaching',7),
('Visakhapatnam','neet coaching',7),('Vijayawada','neet coaching',7),

-- jee coaching
('Delhi','jee coaching',10),('Mumbai','jee coaching',9),('Bangalore','jee coaching',9),
('Kota','jee coaching',10),('Hyderabad','jee coaching',9),('Chennai','jee coaching',8),
('Pune','jee coaching',8),('Ahmedabad','jee coaching',8),('Jaipur','jee coaching',8),
('Chandigarh','jee coaching',7),('Indore','jee coaching',7),('Patna','jee coaching',7),
('Lucknow','jee coaching',7),('Noida','jee coaching',7),('Siliguri','jee coaching',5),

-- dance academy
('Mumbai','dance academy',8),('Delhi','dance academy',8),('Bangalore','dance academy',8),
('Hyderabad','dance academy',7),('Chennai','dance academy',8),('Pune','dance academy',7),
('Kolkata','dance academy',8),('Ahmedabad','dance academy',7),('Jaipur','dance academy',7),
('Chandigarh','dance academy',6),('Kochi','dance academy',6),('Vadodara','dance academy',7),
('Surat','dance academy',6),('Mysuru','dance academy',6),('Coimbatore','dance academy',6),

-- music academy
('Mumbai','music academy',8),('Delhi','music academy',8),('Bangalore','music academy',8),
('Hyderabad','music academy',7),('Chennai','music academy',8),('Pune','music academy',7),
('Kolkata','music academy',7),('Ahmedabad','music academy',6),('Jaipur','music academy',6),
('Chandigarh','music academy',6),('Kochi','music academy',6),('Vadodara','music academy',6),
('Mysuru','music academy',5),

-- playschool / montessori
('Mumbai','playschool',8),('Delhi','playschool',8),('Bangalore','playschool',8),
('Hyderabad','playschool',7),('Chennai','playschool',7),('Pune','playschool',8),
('Ahmedabad','playschool',7),('Jaipur','playschool',6),('Surat','playschool',6),
('Vadodara','playschool',6),('Chandigarh','playschool',6),('Noida','playschool',6),
('Gurugram','playschool',7),('Kochi','playschool',6),

-- ════════════════════════════════════════════════════════════
--  PROFESSIONAL SERVICES — highest ticket, B2B outreach
-- ════════════════════════════════════════════════════════════

-- chartered accountant
('Mumbai','chartered accountant',10),('Delhi','chartered accountant',10),('Bangalore','chartered accountant',10),
('Hyderabad','chartered accountant',9),('Chennai','chartered accountant',9),('Pune','chartered accountant',9),
('Kolkata','chartered accountant',9),('Ahmedabad','chartered accountant',10),('Jaipur','chartered accountant',8),
('Surat','chartered accountant',9),('Lucknow','chartered accountant',8),('Nagpur','chartered accountant',8),
('Indore','chartered accountant',8),('Vadodara','chartered accountant',8),('Ludhiana','chartered accountant',7),
('Coimbatore','chartered accountant',7),('Chandigarh','chartered accountant',7),('Kochi','chartered accountant',7),
('Jamshedpur','chartered accountant',7),('Amritsar','chartered accountant',7),('Rajkot','chartered accountant',7),
('Nashik','chartered accountant',7),('Bhopal','chartered accountant',7),('Patna','chartered accountant',7),
('Visakhapatnam','chartered accountant',7),('Vijayawada','chartered accountant',6),('Bhubaneswar','chartered accountant',6),
('Noida','chartered accountant',7),('Gurugram','chartered accountant',8),('Guwahati','chartered accountant',6),
('Ranchi','chartered accountant',6),('Dehradun','chartered accountant',5),('Goa','chartered accountant',6),

-- gst consultant
('Mumbai','gst consultant',9),('Delhi','gst consultant',9),('Bangalore','gst consultant',8),
('Hyderabad','gst consultant',8),('Chennai','gst consultant',8),('Pune','gst consultant',8),
('Ahmedabad','gst consultant',9),('Jaipur','gst consultant',7),('Surat','gst consultant',8),
('Lucknow','gst consultant',7),('Nagpur','gst consultant',7),('Vadodara','gst consultant',7),
('Indore','gst consultant',7),('Chandigarh','gst consultant',6),('Kochi','gst consultant',6),
('Coimbatore','gst consultant',6),('Patna','gst consultant',6),

-- income tax consultant
('Mumbai','income tax consultant',9),('Delhi','income tax consultant',9),('Bangalore','income tax consultant',8),
('Hyderabad','income tax consultant',8),('Chennai','income tax consultant',8),('Pune','income tax consultant',8),
('Ahmedabad','income tax consultant',8),('Jaipur','income tax consultant',7),('Surat','income tax consultant',7),
('Lucknow','income tax consultant',7),('Vadodara','income tax consultant',7),('Indore','income tax consultant',7),
('Chandigarh','income tax consultant',6),('Patna','income tax consultant',6),('Ranchi','income tax consultant',5),

-- lawyer
('Mumbai','lawyer',9),('Delhi','lawyer',9),('Bangalore','lawyer',8),
('Hyderabad','lawyer',8),('Chennai','lawyer',8),('Pune','lawyer',8),
('Kolkata','lawyer',8),('Ahmedabad','lawyer',8),('Jaipur','lawyer',7),
('Lucknow','lawyer',7),('Chandigarh','lawyer',7),('Patna','lawyer',6),
('Vadodara','lawyer',7),('Nagpur','lawyer',7),('Coimbatore','lawyer',6),

-- insurance agent
('Mumbai','insurance agent',8),('Delhi','insurance agent',8),('Bangalore','insurance agent',8),
('Hyderabad','insurance agent',7),('Chennai','insurance agent',7),('Pune','insurance agent',7),
('Kolkata','insurance agent',7),('Ahmedabad','insurance agent',7),('Jaipur','insurance agent',6),
('Surat','insurance agent',6),('Lucknow','insurance agent',6),('Vadodara','insurance agent',6),
('Chandigarh','insurance agent',6),('Patna','insurance agent',5),

-- loan agent
('Mumbai','loan agent',8),('Delhi','loan agent',8),('Bangalore','loan agent',7),
('Hyderabad','loan agent',7),('Pune','loan agent',7),('Ahmedabad','loan agent',7),
('Jaipur','loan agent',6),('Surat','loan agent',6),('Lucknow','loan agent',6),
('Vadodara','loan agent',6),('Chandigarh','loan agent',5),('Noida','loan agent',6),

-- ════════════════════════════════════════════════════════════
--  REAL ESTATE & CONSTRUCTION — high ticket, long sales cycle
-- ════════════════════════════════════════════════════════════

-- real estate
('Mumbai','real estate',10),('Delhi','real estate',10),('Bangalore','real estate',10),
('Hyderabad','real estate',10),('Chennai','real estate',9),('Pune','real estate',10),
('Ahmedabad','real estate',9),('Jaipur','real estate',8),('Noida','real estate',9),
('Gurugram','real estate',10),('Navi Mumbai','real estate',9),('Thane','real estate',9),
('Surat','real estate',8),('Nagpur','real estate',8),('Indore','real estate',8),
('Bhopal','real estate',8),('Lucknow','real estate',8),('Vadodara','real estate',8),
('Chandigarh','real estate',7),('Kochi','real estate',7),('Jodhpur','real estate',6),
('Rajkot','real estate',6),('Coimbatore','real estate',6),('Bhubaneswar','real estate',6),
('Goa','real estate',7),('Dehradun','real estate',6),

-- interior designer
('Mumbai','interior designer',9),('Delhi','interior designer',9),('Bangalore','interior designer',9),
('Hyderabad','interior designer',8),('Chennai','interior designer',8),('Pune','interior designer',8),
('Ahmedabad','interior designer',8),('Gurugram','interior designer',9),('Noida','interior designer',7),
('Jaipur','interior designer',7),('Surat','interior designer',7),('Kochi','interior designer',7),
('Chandigarh','interior designer',7),('Vadodara','interior designer',7),('Nagpur','interior designer',6),
('Coimbatore','interior designer',6),('Mysuru','interior designer',6),('Goa','interior designer',6),

-- architect
('Mumbai','architect',8),('Delhi','architect',8),('Bangalore','architect',8),
('Hyderabad','architect',7),('Chennai','architect',7),('Pune','architect',7),
('Ahmedabad','architect',7),('Gurugram','architect',7),('Jaipur','architect',6),
('Kochi','architect',6),('Chandigarh','architect',6),('Vadodara','architect',6),
('Coimbatore','architect',6),('Surat','architect',6),

-- civil contractor
('Mumbai','civil contractor',8),('Delhi','civil contractor',8),('Bangalore','civil contractor',7),
('Hyderabad','civil contractor',7),('Pune','civil contractor',7),('Ahmedabad','civil contractor',7),
('Jaipur','civil contractor',6),('Surat','civil contractor',6),('Nagpur','civil contractor',6),
('Vadodara','civil contractor',6),('Chandigarh','civil contractor',6),('Noida','civil contractor',7),

-- ════════════════════════════════════════════════════════════
--  EVENTS & PHOTOGRAPHY — seasonal high ticket
-- ════════════════════════════════════════════════════════════

-- wedding planner
('Mumbai','wedding planner',10),('Delhi','wedding planner',10),('Jaipur','wedding planner',10),
('Bangalore','wedding planner',9),('Hyderabad','wedding planner',9),('Chennai','wedding planner',8),
('Pune','wedding planner',9),('Kolkata','wedding planner',9),('Ahmedabad','wedding planner',9),
('Surat','wedding planner',8),('Lucknow','wedding planner',8),('Amritsar','wedding planner',8),
('Chandigarh','wedding planner',8),('Kochi','wedding planner',7),('Udaipur','wedding planner',9),
('Jodhpur','wedding planner',8),('Vadodara','wedding planner',7),('Nagpur','wedding planner',7),
('Indore','wedding planner',7),('Goa','wedding planner',9),('Bhopal','wedding planner',7),

-- photographer
('Mumbai','photographer',9),('Delhi','photographer',9),('Bangalore','photographer',9),
('Hyderabad','photographer',8),('Chennai','photographer',8),('Pune','photographer',8),
('Kolkata','photographer',8),('Ahmedabad','photographer',7),('Jaipur','photographer',7),
('Surat','photographer',7),('Chandigarh','photographer',7),('Kochi','photographer',7),
('Lucknow','photographer',7),('Udaipur','photographer',7),('Goa','photographer',8),
('Mysuru','photographer',6),('Vadodara','photographer',6),('Amritsar','photographer',6),
('Indore','photographer',6),('Ranchi','photographer',5),

-- event planner
('Mumbai','event planner',9),('Delhi','event planner',9),('Bangalore','event planner',8),
('Hyderabad','event planner',8),('Chennai','event planner',8),('Pune','event planner',8),
('Kolkata','event planner',7),('Ahmedabad','event planner',7),('Jaipur','event planner',7),
('Chandigarh','event planner',6),('Kochi','event planner',6),('Surat','event planner',6),
('Vadodara','event planner',6),('Goa','event planner',8),('Udaipur','event planner',7),
('Noida','event planner',6),('Gurugram','event planner',7),

-- ════════════════════════════════════════════════════════════
--  HOME SERVICES — high volume, repeat business
-- ════════════════════════════════════════════════════════════

-- plumber
('Mumbai','plumber',8),('Delhi','plumber',8),('Bangalore','plumber',8),
('Hyderabad','plumber',7),('Chennai','plumber',7),('Pune','plumber',7),
('Ahmedabad','plumber',7),('Jaipur','plumber',6),('Surat','plumber',6),
('Nagpur','plumber',6),('Vadodara','plumber',6),('Chandigarh','plumber',5),
('Noida','plumber',6),('Gurugram','plumber',7),('Thane','plumber',7),

-- electrician
('Mumbai','electrician',8),('Delhi','electrician',8),('Bangalore','electrician',8),
('Hyderabad','electrician',7),('Chennai','electrician',7),('Pune','electrician',7),
('Ahmedabad','electrician',7),('Jaipur','electrician',6),('Surat','electrician',6),
('Nagpur','electrician',6),('Vadodara','electrician',6),('Chandigarh','electrician',5),
('Noida','electrician',6),('Gurugram','electrician',7),('Thane','electrician',7),

-- pest control
('Mumbai','pest control',8),('Delhi','pest control',8),('Bangalore','pest control',8),
('Hyderabad','pest control',7),('Chennai','pest control',7),('Pune','pest control',7),
('Ahmedabad','pest control',7),('Jaipur','pest control',6),('Surat','pest control',6),
('Vadodara','pest control',6),('Nagpur','pest control',6),('Noida','pest control',6),
('Gurugram','pest control',7),('Chandigarh','pest control',5),

-- ac repair
('Mumbai','ac repair',8),('Delhi','ac repair',9),('Bangalore','ac repair',7),
('Hyderabad','ac repair',8),('Chennai','ac repair',8),('Pune','ac repair',7),
('Ahmedabad','ac repair',7),('Jaipur','ac repair',7),('Surat','ac repair',7),
('Vadodara','ac repair',6),('Nagpur','ac repair',6),('Lucknow','ac repair',6),
('Noida','ac repair',7),('Gurugram','ac repair',8),('Chandigarh','ac repair',6),

-- home cleaning service
('Mumbai','home cleaning service',8),('Delhi','home cleaning service',8),
('Bangalore','home cleaning service',8),('Hyderabad','home cleaning service',7),
('Chennai','home cleaning service',7),('Pune','home cleaning service',7),
('Ahmedabad','home cleaning service',7),('Noida','home cleaning service',7),
('Gurugram','home cleaning service',8),('Thane','home cleaning service',7),
('Surat','home cleaning service',6),('Chandigarh','home cleaning service',6),

-- packers and movers
('Mumbai','packers and movers',9),('Delhi','packers and movers',9),('Bangalore','packers and movers',9),
('Hyderabad','packers and movers',8),('Chennai','packers and movers',8),('Pune','packers and movers',8),
('Ahmedabad','packers and movers',8),('Jaipur','packers and movers',7),('Surat','packers and movers',7),
('Nagpur','packers and movers',7),('Vadodara','packers and movers',7),('Lucknow','packers and movers',7),
('Chandigarh','packers and movers',6),('Kochi','packers and movers',6),('Noida','packers and movers',7),
('Gurugram','packers and movers',8),('Ranchi','packers and movers',5),

-- ════════════════════════════════════════════════════════════
--  DIGITAL & TECH — Levitate's direct competitor-customers
-- ════════════════════════════════════════════════════════════

-- software company
('Mumbai','software company',9),('Delhi','software company',9),('Bangalore','software company',10),
('Hyderabad','software company',9),('Chennai','software company',9),('Pune','software company',10),
('Ahmedabad','software company',8),('Indore','software company',8),('Jaipur','software company',7),
('Kochi','software company',7),('Chandigarh','software company',7),('Vadodara','software company',7),
('Coimbatore','software company',7),('Noida','software company',8),('Gurugram','software company',9),
('Bhubaneswar','software company',6),('Mohali','software company',7),

-- digital marketing
('Mumbai','digital marketing',9),('Delhi','digital marketing',9),('Bangalore','digital marketing',9),
('Hyderabad','digital marketing',8),('Chennai','digital marketing',8),('Pune','digital marketing',8),
('Ahmedabad','digital marketing',8),('Jaipur','digital marketing',7),('Surat','digital marketing',7),
('Vadodara','digital marketing',7),('Indore','digital marketing',7),('Chandigarh','digital marketing',7),
('Kochi','digital marketing',7),('Noida','digital marketing',7),('Gurugram','digital marketing',8),
('Coimbatore','digital marketing',6),('Bhubaneswar','digital marketing',5),

-- web designer
('Mumbai','web designer',8),('Delhi','web designer',8),('Bangalore','web designer',9),
('Hyderabad','web designer',8),('Chennai','web designer',8),('Pune','web designer',8),
('Ahmedabad','web designer',7),('Indore','web designer',7),('Jaipur','web designer',7),
('Vadodara','web designer',7),('Chandigarh','web designer',7),('Kochi','web designer',6),
('Noida','web designer',7),('Gurugram','web designer',8),('Coimbatore','web designer',6),

-- ════════════════════════════════════════════════════════════
--  HOSPITALITY & TRAVEL
-- ════════════════════════════════════════════════════════════

-- hotel
('Mumbai','hotel',9),('Delhi','hotel',9),('Goa','hotel',10),('Jaipur','hotel',9),
('Udaipur','hotel',9),('Bangalore','hotel',8),('Hyderabad','hotel',8),('Chennai','hotel',8),
('Pune','hotel',8),('Kolkata','hotel',8),('Ahmedabad','hotel',8),('Mysuru','hotel',7),
('Agra','hotel',8),('Varanasi','hotel',8),('Rishikesh','hotel',8),('Haridwar','hotel',7),
('Amritsar','hotel',8),('Kochi','hotel',7),('Coimbatore','hotel',6),
('Shimla','hotel',7),('Dharamshala','hotel',7),('Manali','hotel',7),

-- travel agency
('Mumbai','travel agency',8),('Delhi','travel agency',8),('Bangalore','travel agency',7),
('Hyderabad','travel agency',7),('Chennai','travel agency',7),('Pune','travel agency',7),
('Ahmedabad','travel agency',7),('Jaipur','travel agency',7),('Kochi','travel agency',7),
('Goa','travel agency',8),('Chandigarh','travel agency',6),('Amritsar','travel agency',7),
('Coimbatore','travel agency',6),('Vadodara','travel agency',6),

-- ════════════════════════════════════════════════════════════
--  AUTOMOTIVE
-- ════════════════════════════════════════════════════════════

-- car service
('Mumbai','car service',8),('Delhi','car service',8),('Bangalore','car service',8),
('Hyderabad','car service',7),('Chennai','car service',7),('Pune','car service',7),
('Ahmedabad','car service',7),('Jaipur','car service',6),('Surat','car service',6),
('Nagpur','car service',6),('Vadodara','car service',6),('Chandigarh','car service',6),
('Noida','car service',6),('Gurugram','car service',7),('Ludhiana','car service',5),

-- driving school
('Mumbai','driving school',8),('Delhi','driving school',8),('Bangalore','driving school',7),
('Hyderabad','driving school',7),('Chennai','driving school',7),('Pune','driving school',7),
('Ahmedabad','driving school',7),('Jaipur','driving school',6),('Surat','driving school',6),
('Vadodara','driving school',6),('Chandigarh','driving school',6),('Noida','driving school',6),
('Lucknow','driving school',6),('Amritsar','driving school',5),

-- ════════════════════════════════════════════════════════════
--  PRINTING & MEDIA
-- ════════════════════════════════════════════════════════════

-- printing shop
('Mumbai','printing shop',7),('Delhi','printing shop',7),('Bangalore','printing shop',7),
('Hyderabad','printing shop',6),('Chennai','printing shop',6),('Pune','printing shop',6),
('Ahmedabad','printing shop',6),('Surat','printing shop',7),('Jaipur','printing shop',6),
('Vadodara','printing shop',6),('Lucknow','printing shop',5),('Nagpur','printing shop',5),
('Chandigarh','printing shop',5),('Noida','printing shop',5),

-- ════════════════════════════════════════════════════════════
--  GROCERY & DAILY NEEDS
-- ════════════════════════════════════════════════════════════

-- kirana store
('Mumbai','kirana store',7),('Delhi','kirana store',7),('Bangalore','kirana store',7),
('Hyderabad','kirana store',7),('Chennai','kirana store',7),('Kolkata','kirana store',7),
('Ahmedabad','kirana store',7),('Pune','kirana store',7),('Patna','kirana store',7),
('Surat','kirana store',7),('Lucknow','kirana store',7),('Kanpur','kirana store',7),
('Vadodara','kirana store',6),('Nagpur','kirana store',6),('Bhopal','kirana store',6),
('Jaipur','kirana store',6),('Ranchi','kirana store',6),('Guwahati','kirana store',5),
('Jamshedpur','kirana store',6),('Varanasi','kirana store',6),('Agra','kirana store',5),

-- supermarket
('Mumbai','supermarket',8),('Delhi','supermarket',8),('Bangalore','supermarket',8),
('Hyderabad','supermarket',7),('Chennai','supermarket',7),('Pune','supermarket',7),
('Ahmedabad','supermarket',7),('Jaipur','supermarket',6),('Surat','supermarket',6),
('Chandigarh','supermarket',6),('Kochi','supermarket',6),('Noida','supermarket',6),
('Gurugram','supermarket',7),('Vadodara','supermarket',6),

-- ════════════════════════════════════════════════════════════
--  MANUFACTURING / INDUSTRIAL / B2B (city-specific)
-- ════════════════════════════════════════════════════════════

('Surat','diamond trading',10),('Surat','textile shop',9),('Surat','fabric wholesaler',8),
('Ludhiana','hosiery manufacturer',9),('Ludhiana','garment factory',8),
('Tiruppur','garment factory',9),('Tiruppur','knitwear manufacturer',9),
('Coimbatore','machine shop',8),('Coimbatore','industrial equipment',8),
('Rajkot','engineering workshop',8),('Rajkot','auto parts',7),
('Ahmedabad','chemical supplier',8),('Ahmedabad','pharmaceutical company',8),
('Mumbai','logistics company',8),('Delhi','logistics company',8),('Bangalore','logistics company',7),
('Jamshedpur','steel dealer',8),('Rourkela','steel dealer',8),
('Bhilai','construction company',7),('Raipur','construction company',7),
('Gandhinagar','solar energy company',7),('Surat','solar energy company',6)

ON CONFLICT (city, business_type) DO UPDATE SET
  priority = EXCLUDED.priority,
  is_active = true;

-- Done.
-- Total: ~1,100 city-category combinations
-- Covers 70+ cities from free-sources.ts CITIES list
-- Covers 35+ categories from free-sources.ts CATEGORIES list
-- Run: Supabase Dashboard → SQL Editor → Run
