import 'dotenv/config'
import { randomBytes } from 'crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { calculatePrice } from '../src/utils/pricing'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// All vendor passwords are "password123" — for local dev only
const VENDOR_PASSWORD = 'password123'

const vendors = [
  { email: 'admin@amazon.in', companyName: 'Amazon India', phone: '9800000001' },
  { email: 'ops@flipkart.com', companyName: 'Flipkart', phone: '9800000002' },
  { email: 'dispatch@meesho.com', companyName: 'Meesho', phone: '9800000003' },
  { email: 'logistics@myntra.com', companyName: 'Myntra', phone: '9800000004' },
  { email: 'ship@nykaa.com', companyName: 'Nykaa', phone: '9800000005' },
]

const priorities: Array<'STANDARD' | 'EXPRESS' | 'SAME_DAY'> = ['STANDARD', 'EXPRESS', 'SAME_DAY']

// Realistic product catalog per vendor type
const products: Record<number, Array<{ description: string; weight: number }>> = {
  // Amazon — electronics, gadgets, appliances
  0: [
    { description: 'iPhone 15 Pro Max', weight: 0.4 },
    { description: 'Samsung Galaxy S24 Ultra', weight: 0.5 },
    { description: 'MacBook Air M3', weight: 1.5 },
    { description: 'Sony WH-1000XM5 Headphones', weight: 0.3 },
    { description: 'Dyson V15 Vacuum Cleaner', weight: 3.2 },
    { description: 'Kindle Paperwhite', weight: 0.2 },
    { description: 'LG 55" OLED TV', weight: 18.0 },
    { description: 'iPad Air 5th Gen', weight: 0.6 },
    { description: 'Bose QuietComfort Earbuds', weight: 0.1 },
    { description: 'Dell 27" 4K Monitor', weight: 6.5 },
    { description: 'PlayStation 5 Console', weight: 4.5 },
    { description: 'Apple Watch Ultra 2', weight: 0.2 },
    { description: 'GoPro Hero 12', weight: 0.3 },
    { description: 'Logitech MX Master 3S Mouse', weight: 0.15 },
    { description: 'Marshall Stanmore III Speaker', weight: 4.8 },
    { description: 'DJI Mini 4 Pro Drone', weight: 0.5 },
    { description: 'Instant Pot Duo 7-in-1', weight: 5.0 },
    { description: 'Fitbit Charge 6', weight: 0.1 },
  ],
  // Flipkart — mix of electronics and home
  1: [
    { description: 'Realme GT 5 Pro', weight: 0.4 },
    { description: 'Bosch Washing Machine 7kg', weight: 35.0 },
    { description: 'HP Pavilion Laptop 15"', weight: 2.1 },
    { description: 'Prestige Induction Cooktop', weight: 2.5 },
    { description: 'JBL Charge 5 Speaker', weight: 0.9 },
    { description: 'Canon EOS R50 Camera', weight: 0.7 },
    { description: 'OnePlus 12 5G', weight: 0.4 },
    { description: 'Samsung 32" LED TV', weight: 7.0 },
    { description: 'Crompton Ceiling Fan', weight: 4.0 },
    { description: 'Whirlpool Refrigerator 260L', weight: 45.0 },
    { description: 'Mi Robot Vacuum Mop', weight: 3.5 },
    { description: 'Boat Airdopes 441', weight: 0.1 },
    { description: 'Lenovo IdeaPad Slim 3', weight: 1.8 },
    { description: 'Philips Air Fryer HD9252', weight: 4.5 },
    { description: 'Google Pixel 8a', weight: 0.4 },
  ],
  // Meesho — fashion, home decor, budget items
  2: [
    { description: 'Cotton Kurta Set (Pack of 3)', weight: 0.6 },
    { description: 'Silk Saree - Banarasi', weight: 0.4 },
    { description: 'Artificial Jewellery Set', weight: 0.2 },
    { description: 'Kids T-Shirt Combo (5 Pack)', weight: 0.5 },
    { description: 'Bedsheet Set - King Size', weight: 1.2 },
    { description: 'Wall Clock - Wooden Vintage', weight: 0.8 },
    { description: 'Handbag - Faux Leather', weight: 0.4 },
    { description: 'Men Casual Shoes Size 9', weight: 0.7 },
    { description: 'Curtain Set - Blackout', weight: 1.5 },
    { description: 'Makeup Organizer Box', weight: 0.6 },
    { description: 'Phone Cover Combo (10 Pack)', weight: 0.3 },
    { description: 'Kitchen Storage Container Set', weight: 1.0 },
    { description: 'Women Palazzo Pants (2 Pack)', weight: 0.4 },
    { description: 'Decorative Cushion Covers (5)', weight: 0.8 },
  ],
  // Myntra — fashion and apparel
  3: [
    { description: 'Nike Air Max 90', weight: 0.8 },
    { description: 'Levi\'s 511 Slim Fit Jeans', weight: 0.6 },
    { description: 'Adidas Ultraboost 23', weight: 0.7 },
    { description: 'H&M Linen Blazer', weight: 0.5 },
    { description: 'Puma RS-X Sneakers', weight: 0.8 },
    { description: 'Allen Solly Formal Shirt', weight: 0.3 },
    { description: 'Roadster Denim Jacket', weight: 0.9 },
    { description: 'Mango Pleated Skirt', weight: 0.3 },
    { description: 'US Polo Assn Polo T-Shirt', weight: 0.2 },
    { description: 'Fastrack Analog Watch', weight: 0.15 },
    { description: 'Wildcraft Backpack 45L', weight: 0.8 },
    { description: 'Van Heusen Chinos', weight: 0.5 },
    { description: 'Crocs Classic Clog', weight: 0.4 },
  ],
  // Nykaa — beauty and skincare
  4: [
    { description: 'MAC Lipstick - Ruby Woo', weight: 0.05 },
    { description: 'The Ordinary Niacinamide Serum', weight: 0.1 },
    { description: 'Maybelline Fit Me Foundation', weight: 0.15 },
    { description: 'Lakme Eyeconic Kajal (3 Pack)', weight: 0.1 },
    { description: 'Forest Essentials Night Cream', weight: 0.2 },
    { description: 'Bath & Body Works Mist Set', weight: 0.8 },
    { description: 'Dyson Airwrap Styler', weight: 1.5 },
    { description: 'Cetaphil Gentle Cleanser 500ml', weight: 0.6 },
    { description: 'Kay Beauty Blush Palette', weight: 0.15 },
    { description: 'Minimalist Retinol Serum', weight: 0.1 },
    { description: 'Plum Green Tea Face Wash', weight: 0.2 },
    { description: 'Sugar Cosmetics Lipstick Set', weight: 0.2 },
  ],
}

// Pickup locations per vendor
const pickups: Record<number, Array<{ address: string; city: string; pincode: string; contact: string; phone: string }>> = {
  0: [
    { address: 'Warehouse A, Bhiwandi', city: 'Mumbai', pincode: '421302', contact: 'Ravi Sharma', phone: '9123456701' },
    { address: 'Warehouse B, Andheri East', city: 'Mumbai', pincode: '400069', contact: 'Amit Patel', phone: '9123456702' },
    { address: 'Warehouse C, Whitefield', city: 'Bangalore', pincode: '560066', contact: 'Kiran Reddy', phone: '9123456703' },
    { address: 'Warehouse D, Manesar', city: 'Gurgaon', pincode: '122051', contact: 'Suresh Kumar', phone: '9123456704' },
  ],
  1: [
    { address: 'Hub 1, Electronic City', city: 'Bangalore', pincode: '560100', contact: 'Manoj Verma', phone: '9123456710' },
    { address: 'Hub 2, Hosur Road', city: 'Bangalore', pincode: '560029', contact: 'Ramesh Iyer', phone: '9123456711' },
    { address: 'Hub 3, Peenya', city: 'Bangalore', pincode: '560058', contact: 'Sanjay Das', phone: '9123456712' },
  ],
  2: [
    { address: 'Supplier Hub, Surat Textile Market', city: 'Surat', pincode: '395002', contact: 'Bhavesh Shah', phone: '9123456720' },
    { address: 'Supplier Hub, Varanasi Silk Market', city: 'Varanasi', pincode: '221001', contact: 'Rajesh Mishra', phone: '9123456721' },
    { address: 'Supplier Hub, Tirupur', city: 'Tirupur', pincode: '641601', contact: 'Ganesh M', phone: '9123456723' },
    { address: 'Supplier Hub, Panipat', city: 'Panipat', pincode: '132103', contact: 'Vikas Goyal', phone: '9123456724' },
  ],
  3: [
    { address: 'FC Warehouse, Bilaspur', city: 'Gurgaon', pincode: '122413', contact: 'Deepak Tomar', phone: '9123456730' },
    { address: 'FC Warehouse, Bommasandra', city: 'Bangalore', pincode: '560099', contact: 'Naveen Gowda', phone: '9123456731' },
    { address: 'FC Warehouse, Bhiwandi', city: 'Mumbai', pincode: '421302', contact: 'Pravin Patil', phone: '9123456732' },
  ],
  4: [
    { address: 'Nykaa Warehouse, Airoli', city: 'Navi Mumbai', pincode: '400708', contact: 'Shruti Nair', phone: '9123456740' },
    { address: 'Nykaa Hub, HSR Layout', city: 'Bangalore', pincode: '560102', contact: 'Kavya Menon', phone: '9123456741' },
  ],
}

// Delivery destinations — realistic Indian addresses
const deliveries = [
  { address: 'Flat 12B, Koregaon Park', city: 'Pune', pincode: '411001', name: 'Harsh Desai', phone: '9876543201', email: 'harsh@example.com' },
  { address: '22 MG Road, Indiranagar', city: 'Bangalore', pincode: '560038', name: 'Priya Nair', phone: '9876543202', email: 'priya.nair@example.com' },
  { address: 'C-45 Sector 62', city: 'Noida', pincode: '201301', name: 'Rohan Gupta', phone: '9876543203', email: 'rohan.g@example.com' },
  { address: '15 Park Street', city: 'Kolkata', pincode: '700016', name: 'Sneha Chatterjee', phone: '9876543204', email: 'sneha.c@example.com' },
  { address: '88 Anna Nagar', city: 'Chennai', pincode: '600040', name: 'Karthik Subramaniam', phone: '9876543205', email: null },
  { address: '7 Civil Lines', city: 'Jaipur', pincode: '302006', name: 'Meera Joshi', phone: '9876543206', email: 'meera.j@example.com' },
  { address: '3rd Floor, Jubilee Hills', city: 'Hyderabad', pincode: '500033', name: 'Arjun Rao', phone: '9876543207', email: 'arjun.rao@example.com' },
  { address: 'Plot 14, DLF Phase 3', city: 'Gurgaon', pincode: '122002', name: 'Vikram Singh', phone: '9876543208', email: 'vikram.s@example.com' },
  { address: '12 Residency Road', city: 'Bangalore', pincode: '560025', name: 'Deepa Kulkarni', phone: '9876543210', email: 'deepa.k@example.com' },
  { address: 'A-Block, Adyar', city: 'Chennai', pincode: '600020', name: 'Lakshmi Venkatesh', phone: '9876543211', email: null },
  { address: '55 Banjara Hills', city: 'Hyderabad', pincode: '500034', name: 'Aditya Reddy', phone: '9876543212', email: 'aditya.r@example.com' },
  { address: '9 Salt Lake City', city: 'Kolkata', pincode: '700091', name: 'Ananya Bose', phone: '9876543213', email: 'ananya.b@example.com' },
  { address: '22 Connaught Place', city: 'New Delhi', pincode: '110001', name: 'Rahul Malhotra', phone: '9876543214', email: 'rahul.m@example.com' },
  { address: '8 MG Road', city: 'Kochi', pincode: '682016', name: 'Nikhil Thomas', phone: '9876543215', email: 'nikhil.t@example.com' },
  { address: '34 Lajpat Nagar', city: 'New Delhi', pincode: '110024', name: 'Pooja Sharma', phone: '9876543220', email: null },
  { address: '67 Gomti Nagar', city: 'Lucknow', pincode: '226010', name: 'Sunita Tiwari', phone: '9876543221', email: 'sunita.t@example.com' },
  { address: '5 FC Road, Deccan', city: 'Pune', pincode: '411004', name: 'Ritika Deshpande', phone: '9876543222', email: 'ritika.d@example.com' },
  { address: '19 Jayanagar 4th Block', city: 'Bangalore', pincode: '560041', name: 'Divya Hegde', phone: '9876543223', email: null },
  { address: '28 Satellite Road', city: 'Ahmedabad', pincode: '380015', name: 'Mansi Desai', phone: '9876543224', email: 'mansi.d@example.com' },
  { address: '42 Aundh Road', city: 'Pune', pincode: '411007', name: 'Siddharth Jain', phone: '9876543225', email: 'sid.jain@example.com' },
  { address: '11 Linking Road, Bandra', city: 'Mumbai', pincode: '400050', name: 'Aarav Kapoor', phone: '9876543226', email: 'aarav.k@example.com' },
  { address: '33 Alwarpet', city: 'Chennai', pincode: '600018', name: 'Nandini Rajan', phone: '9876543227', email: 'nandini.r@example.com' },
  { address: '6 Hazratganj', city: 'Lucknow', pincode: '226001', name: 'Aman Verma', phone: '9876543228', email: null },
  { address: '78 Shivaji Nagar', city: 'Pune', pincode: '411005', name: 'Tanvi Patil', phone: '9876543229', email: 'tanvi.p@example.com' },
  { address: '21 Camac Street', city: 'Kolkata', pincode: '700017', name: 'Sourav Das', phone: '9876543230', email: 'sourav.d@example.com' },
  { address: '14 Ashok Nagar', city: 'Chennai', pincode: '600083', name: 'Revathi Krishnan', phone: '9876543231', email: 'revathi.k@example.com' },
  { address: 'B-12 Vasant Kunj', city: 'New Delhi', pincode: '110070', name: 'Ishaan Khanna', phone: '9876543232', email: 'ishaan.k@example.com' },
  { address: '90 Boat Club Road', city: 'Pune', pincode: '411001', name: 'Gauri Kulkarni', phone: '9876543233', email: null },
  { address: '17 Lavelle Road', city: 'Bangalore', pincode: '560001', name: 'Shreyas Gowda', phone: '9876543234', email: 'shreyas.g@example.com' },
  { address: '2 Sarjapur Road', city: 'Bangalore', pincode: '560035', name: 'Trisha Reddy', phone: '9876543235', email: 'trisha.r@example.com' },
  { address: '45 CG Road', city: 'Ahmedabad', pincode: '380006', name: 'Dhruv Mehta', phone: '9876543236', email: 'dhruv.m@example.com' },
  { address: '8 Race Course Road', city: 'Coimbatore', pincode: '641018', name: 'Arun Balaji', phone: '9876543237', email: null },
  { address: '63 Marine Drive', city: 'Mumbai', pincode: '400020', name: 'Zara Sheikh', phone: '9876543238', email: 'zara.s@example.com' },
  { address: '10 GS Road', city: 'Guwahati', pincode: '781005', name: 'Rishab Borah', phone: '9876543239', email: 'rishab.b@example.com' },
  { address: '25 Mall Road', city: 'Shimla', pincode: '171001', name: 'Aakriti Thakur', phone: '9876543240', email: 'aakriti.t@example.com' },
  { address: '55 MG Marg', city: 'Gangtok', pincode: '737101', name: 'Tenzin Lepcha', phone: '9876543241', email: null },
  { address: '30 DB Road, RS Puram', city: 'Coimbatore', pincode: '641002', name: 'Kavitha Mohan', phone: '9876543242', email: 'kavitha.m@example.com' },
  { address: '4 Rajpath', city: 'Patna', pincode: '800001', name: 'Amit Kumar', phone: '9876543243', email: 'amit.k@example.com' },
  { address: '18 Mahatma Gandhi Road', city: 'Indore', pincode: '452001', name: 'Riya Sharma', phone: '9876543244', email: 'riya.s@example.com' },
  { address: 'H-44 Scheme No 54', city: 'Indore', pincode: '452010', name: 'Yash Agarwal', phone: '9876543245', email: null },
  { address: '7 University Road', city: 'Jaipur', pincode: '302004', name: 'Neha Rathore', phone: '9876543246', email: 'neha.r@example.com' },
  { address: '99 Brigade Road', city: 'Bangalore', pincode: '560025', name: 'Varun Shetty', phone: '9876543247', email: 'varun.s@example.com' },
  { address: '16 Old Palasia', city: 'Indore', pincode: '452001', name: 'Sakshi Joshi', phone: '9876543248', email: 'sakshi.j@example.com' },
  { address: '3 Beach Road', city: 'Vizag', pincode: '530001', name: 'Pranav Naidu', phone: '9876543249', email: null },
  { address: '27 Law Garden', city: 'Ahmedabad', pincode: '380006', name: 'Krupa Patel', phone: '9876543250', email: 'krupa.p@example.com' },
  // Phase 2 — semi-urban deliveries (route through local hubs)
  { address: '14 College Road, Nashik', city: 'Nashik', pincode: '422005', name: 'Pooja Pawar', phone: '9876544001', email: 'pooja.p@example.com' },
  { address: '6 CIDCO Sector 2', city: 'Nashik', pincode: '422009', name: 'Mahesh Jadhav', phone: '9876544002', email: null },
  { address: '12 N-2 CIDCO', city: 'Aurangabad', pincode: '431003', name: 'Snehal Kale', phone: '9876544003', email: 'snehal.k@example.com' },
  { address: '5 Saraswati Colony', city: 'Aurangabad', pincode: '431001', name: 'Yogesh Shinde', phone: '9876544004', email: 'yogesh.s@example.com' },
  { address: '8 Vijaynagar', city: 'Mysore', pincode: '570017', name: 'Pavithra Iyengar', phone: '9876544005', email: 'pavithra.i@example.com' },
  { address: '24 Kuvempunagar', city: 'Mysore', pincode: '570023', name: 'Chetan Bhat', phone: '9876544006', email: null },
  { address: '11 Vidyanagar', city: 'Hubli', pincode: '580031', name: 'Anita Patil', phone: '9876544007', email: 'anita.p@example.com' },
  { address: '3 Gokul Road', city: 'Hubli', pincode: '580030', name: 'Mahantesh Kulkarni', phone: '9876544008', email: 'mahantesh.k@example.com' },
  { address: '19 RS Puram West', city: 'Coimbatore', pincode: '641002', name: 'Kavin Murugan', phone: '9876544009', email: 'kavin.m@example.com' },
  { address: '7 Sanjay Place', city: 'Agra', pincode: '282002', name: 'Sahil Khan', phone: '9876544010', email: 'sahil.k@example.com' },
  { address: '21 Tajganj Road', city: 'Agra', pincode: '282001', name: 'Riddhi Agarwal', phone: '9876544011', email: null },
]

// ── HUB DATA ──────────────────────────────────────────────────────────
// Every Indian state/UT gets 1 MAIN hub in the capital/largest city.
// Bigger states get 2-3 LOCAL hubs in tier-2/tier-3 cities.
// Smaller states/UTs get only the MAIN hub (no locals).

const mainHubsData = [
  // ── West ──
  { name: 'Mumbai Main Hub',         city: 'Mumbai',        state: 'Maharashtra',       lat: 19.0760, lng: 72.8777 },
  { name: 'Ahmedabad Main Hub',      city: 'Ahmedabad',     state: 'Gujarat',           lat: 23.0225, lng: 72.5714 },
  { name: 'Panaji Main Hub',         city: 'Panaji',        state: 'Goa',               lat: 15.4909, lng: 73.8278 },

  // ── North ──
  { name: 'Delhi Main Hub',          city: 'Delhi',         state: 'Delhi',             lat: 28.6139, lng: 77.2090 },
  { name: 'Lucknow Main Hub',        city: 'Lucknow',       state: 'Uttar Pradesh',     lat: 26.8467, lng: 80.9462 },
  { name: 'Jaipur Main Hub',         city: 'Jaipur',        state: 'Rajasthan',         lat: 26.9124, lng: 75.7873 },
  { name: 'Chandigarh Main Hub',     city: 'Chandigarh',    state: 'Punjab/Haryana',    lat: 30.7333, lng: 76.7794 },
  { name: 'Dehradun Main Hub',       city: 'Dehradun',      state: 'Uttarakhand',       lat: 30.3165, lng: 78.0322 },
  { name: 'Shimla Main Hub',         city: 'Shimla',        state: 'Himachal Pradesh',  lat: 31.1048, lng: 77.1734 },
  { name: 'Jammu Main Hub',          city: 'Jammu',         state: 'J&K',               lat: 32.7266, lng: 74.8570 },

  // ── South ──
  { name: 'Bangalore Main Hub',      city: 'Bangalore',     state: 'Karnataka',         lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai Main Hub',        city: 'Chennai',       state: 'Tamil Nadu',        lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad Main Hub',      city: 'Hyderabad',     state: 'Telangana',         lat: 17.3850, lng: 78.4867 },
  { name: 'Kochi Main Hub',          city: 'Kochi',         state: 'Kerala',            lat:  9.9312, lng: 76.2673 },
  { name: 'Amaravati Main Hub',      city: 'Vijayawada',    state: 'Andhra Pradesh',    lat: 16.5062, lng: 80.6480 },

  // ── East ──
  { name: 'Kolkata Main Hub',        city: 'Kolkata',       state: 'West Bengal',       lat: 22.5726, lng: 88.3639 },
  { name: 'Patna Main Hub',          city: 'Patna',         state: 'Bihar',             lat: 25.5941, lng: 85.1376 },
  { name: 'Bhubaneswar Main Hub',    city: 'Bhubaneswar',   state: 'Odisha',            lat: 20.2961, lng: 85.8245 },
  { name: 'Ranchi Main Hub',         city: 'Ranchi',        state: 'Jharkhand',         lat: 23.3441, lng: 85.3096 },

  // ── Central ──
  { name: 'Bhopal Main Hub',         city: 'Bhopal',        state: 'Madhya Pradesh',    lat: 23.2599, lng: 77.4126 },
  { name: 'Raipur Main Hub',         city: 'Raipur',        state: 'Chhattisgarh',      lat: 21.2514, lng: 81.6296 },

  // ── Northeast ──
  { name: 'Guwahati Main Hub',       city: 'Guwahati',      state: 'Assam',             lat: 26.1445, lng: 91.7362 },
  { name: 'Imphal Main Hub',         city: 'Imphal',        state: 'Manipur',           lat: 24.8170, lng: 93.9368 },
  { name: 'Shillong Main Hub',       city: 'Shillong',      state: 'Meghalaya',         lat: 25.5788, lng: 91.8933 },
  { name: 'Gangtok Main Hub',        city: 'Gangtok',       state: 'Sikkim',            lat: 27.3389, lng: 88.6065 },
  { name: 'Agartala Main Hub',       city: 'Agartala',      state: 'Tripura',           lat: 23.8315, lng: 91.2868 },
  { name: 'Aizawl Main Hub',         city: 'Aizawl',        state: 'Mizoram',           lat: 23.7271, lng: 92.7176 },
  { name: 'Kohima Main Hub',         city: 'Kohima',        state: 'Nagaland',          lat: 25.6751, lng: 94.1086 },
  { name: 'Itanagar Main Hub',       city: 'Itanagar',      state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
]

const localHubsData = [
  // ── Maharashtra (under Mumbai) — big state, 3 locals ──
  { name: 'Pune Local Hub',          city: 'Pune',          parentCity: 'Mumbai',       lat: 18.5204, lng: 73.8567 },
  { name: 'Nashik Local Hub',        city: 'Nashik',        parentCity: 'Mumbai',       lat: 19.9975, lng: 73.7898 },
  { name: 'Nagpur Local Hub',        city: 'Nagpur',        parentCity: 'Mumbai',       lat: 21.1458, lng: 79.0882 },

  // ── Gujarat (under Ahmedabad) — 2 locals ──
  { name: 'Surat Local Hub',         city: 'Surat',         parentCity: 'Ahmedabad',    lat: 21.1702, lng: 72.8311 },
  { name: 'Vadodara Local Hub',      city: 'Vadodara',      parentCity: 'Ahmedabad',    lat: 22.3072, lng: 73.1812 },

  // ── Uttar Pradesh (under Lucknow) — big state, 3 locals ──
  { name: 'Noida Local Hub',         city: 'Noida',         parentCity: 'Lucknow',      lat: 28.5355, lng: 77.3910 },
  { name: 'Varanasi Local Hub',      city: 'Varanasi',      parentCity: 'Lucknow',      lat: 25.3176, lng: 82.9739 },
  { name: 'Agra Local Hub',          city: 'Agra',          parentCity: 'Lucknow',      lat: 27.1767, lng: 78.0081 },

  // ── Rajasthan (under Jaipur) — 2 locals ──
  { name: 'Jodhpur Local Hub',       city: 'Jodhpur',       parentCity: 'Jaipur',       lat: 26.2389, lng: 73.0243 },
  { name: 'Udaipur Local Hub',       city: 'Udaipur',       parentCity: 'Jaipur',       lat: 24.5854, lng: 73.7125 },

  // ── Punjab/Haryana (under Chandigarh) — 2 locals ──
  { name: 'Ludhiana Local Hub',      city: 'Ludhiana',      parentCity: 'Chandigarh',   lat: 30.9010, lng: 75.8573 },
  { name: 'Amritsar Local Hub',      city: 'Amritsar',      parentCity: 'Chandigarh',   lat: 31.6340, lng: 74.8723 },

  // ── Karnataka (under Bangalore) — 3 locals ──
  { name: 'Mysore Local Hub',        city: 'Mysore',        parentCity: 'Bangalore',    lat: 12.2958, lng: 76.6394 },
  { name: 'Hubli Local Hub',         city: 'Hubli',         parentCity: 'Bangalore',    lat: 15.3647, lng: 75.1240 },
  { name: 'Mangalore Local Hub',     city: 'Mangalore',     parentCity: 'Bangalore',    lat: 12.9141, lng: 74.8560 },

  // ── Tamil Nadu (under Chennai) — 3 locals ──
  { name: 'Coimbatore Local Hub',    city: 'Coimbatore',    parentCity: 'Chennai',      lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai Local Hub',       city: 'Madurai',       parentCity: 'Chennai',      lat:  9.9252, lng: 78.1198 },
  { name: 'Trichy Local Hub',        city: 'Trichy',        parentCity: 'Chennai',      lat: 10.7905, lng: 78.7047 },

  // ── Telangana (under Hyderabad) — 1 local ──
  { name: 'Warangal Local Hub',      city: 'Warangal',      parentCity: 'Hyderabad',    lat: 17.9784, lng: 79.5941 },

  // ── Andhra Pradesh (under Vijayawada) — 2 locals ──
  { name: 'Vizag Local Hub',         city: 'Vizag',         parentCity: 'Vijayawada',   lat: 17.6868, lng: 83.2185 },
  { name: 'Tirupati Local Hub',      city: 'Tirupati',      parentCity: 'Vijayawada',   lat: 13.6288, lng: 79.4192 },

  // ── Kerala (under Kochi) — 2 locals ──
  { name: 'Trivandrum Local Hub',    city: 'Trivandrum',    parentCity: 'Kochi',        lat:  8.5241, lng: 76.9366 },
  { name: 'Kozhikode Local Hub',     city: 'Kozhikode',     parentCity: 'Kochi',        lat: 11.2588, lng: 75.7804 },

  // ── West Bengal (under Kolkata) — 2 locals ──
  { name: 'Siliguri Local Hub',      city: 'Siliguri',      parentCity: 'Kolkata',      lat: 26.7271, lng: 88.3953 },
  { name: 'Durgapur Local Hub',      city: 'Durgapur',      parentCity: 'Kolkata',      lat: 23.5204, lng: 87.3119 },

  // ── Bihar (under Patna) — 1 local ──
  { name: 'Gaya Local Hub',          city: 'Gaya',          parentCity: 'Patna',        lat: 24.7955, lng: 84.9994 },

  // ── Odisha (under Bhubaneswar) — 1 local ──
  { name: 'Cuttack Local Hub',       city: 'Cuttack',       parentCity: 'Bhubaneswar',  lat: 20.4625, lng: 85.8830 },

  // ── Madhya Pradesh (under Bhopal) — 2 locals ──
  { name: 'Indore Local Hub',        city: 'Indore',        parentCity: 'Bhopal',       lat: 22.7196, lng: 75.8577 },
  { name: 'Jabalpur Local Hub',      city: 'Jabalpur',      parentCity: 'Bhopal',       lat: 23.1815, lng: 79.9864 },

  // ── Assam (under Guwahati) — 1 local ──
  { name: 'Dibrugarh Local Hub',     city: 'Dibrugarh',     parentCity: 'Guwahati',     lat: 27.4728, lng: 94.9120 },

  // ── Uttarakhand (under Dehradun) — 1 local ──
  { name: 'Haridwar Local Hub',      city: 'Haridwar',      parentCity: 'Dehradun',     lat: 29.9457, lng: 78.1642 },

  // ── J&K (under Jammu) — 1 local ──
  { name: 'Srinagar Local Hub',      city: 'Srinagar',      parentCity: 'Jammu',        lat: 34.0837, lng: 74.7973 },
]

// ── CITY COORDS (for nearest-hub computation in seed) ────────────────
const cityCoords: Record<string, [number, number]> = {
  // Main hub cities
  mumbai: [19.0760, 72.8777], delhi: [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946], chennai: [13.0827, 80.2707],
  hyderabad: [17.3850, 78.4867], kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714], lucknow: [26.8467, 80.9462],
  jaipur: [26.9124, 75.7873], chandigarh: [30.7333, 76.7794],
  kochi: [9.9312, 76.2673], patna: [25.5941, 85.1376],
  bhopal: [23.2599, 77.4126], bhubaneswar: [20.2961, 85.8245],
  ranchi: [23.3441, 85.3096], raipur: [21.2514, 81.6296],
  guwahati: [26.1445, 91.7362], dehradun: [30.3165, 78.0322],
  shimla: [31.1048, 77.1734], jammu: [32.7266, 74.8570],
  panaji: [15.4909, 73.8278], vijayawada: [16.5062, 80.6480],
  imphal: [24.8170, 93.9368], shillong: [25.5788, 91.8933],
  gangtok: [27.3389, 88.6065], agartala: [23.8315, 91.2868],
  aizawl: [23.7271, 92.7176], kohima: [25.6751, 94.1086],
  itanagar: [27.0844, 93.6053],
  // Local hub / delivery cities
  pune: [18.5204, 73.8567], nashik: [19.9975, 73.7898],
  nagpur: [21.1458, 79.0882], surat: [21.1702, 72.8311],
  vadodara: [22.3072, 73.1812], noida: [28.5355, 77.3910],
  gurgaon: [28.4595, 77.0266], agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739], jodhpur: [26.2389, 73.0243],
  udaipur: [24.5854, 73.7125], ludhiana: [30.9010, 75.8573],
  amritsar: [31.6340, 74.8723], mysore: [12.2958, 76.6394],
  hubli: [15.3647, 75.1240], mangalore: [12.9141, 74.8560],
  coimbatore: [11.0168, 76.9558], madurai: [9.9252, 78.1198],
  trichy: [10.7905, 78.7047], warangal: [17.9784, 79.5941],
  vizag: [17.6868, 83.2185], tirupati: [13.6288, 79.4192],
  trivandrum: [8.5241, 76.9366], kozhikode: [11.2588, 75.7804],
  siliguri: [26.7271, 88.3953], durgapur: [23.5204, 87.3119],
  gaya: [24.7955, 84.9994], cuttack: [20.4625, 85.8830],
  indore: [22.7196, 75.8577], jabalpur: [23.1815, 79.9864],
  dibrugarh: [27.4728, 94.9120], haridwar: [29.9457, 78.1642],
  srinagar: [34.0837, 74.7973],
  // Other delivery cities
  'new delhi': [28.6139, 77.2090], 'navi mumbai': [19.0330, 73.0297],
  tirupur: [11.1085, 77.3411], panipat: [29.3909, 76.9635],
  aurangabad: [19.8762, 75.3433],
}

// All main hub cities — orders to these cities are "urban" (direct from main hub)
const MAIN_HUB_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bangalore', 'chennai', 'hyderabad',
  'kolkata', 'ahmedabad', 'lucknow', 'jaipur', 'chandigarh', 'kochi',
  'patna', 'bhopal', 'bhubaneswar', 'ranchi', 'raipur', 'guwahati',
  'dehradun', 'shimla', 'jammu', 'panaji', 'vijayawada',
  'imphal', 'shillong', 'gangtok', 'agartala', 'aizawl', 'kohima', 'itanagar',
]

function getCoords(city: string): [number, number] | null {
  const k = Object.keys(cityCoords).find((c) => city.toLowerCase().includes(c))
  return k ? cityCoords[k] : null
}

function isMainHubCity(city: string) {
  return MAIN_HUB_CITIES.some((c) => city.toLowerCase().includes(c))
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── DELIVERY AGENTS ───────────────────────────────────────────────────
// Each main hub: 1 LINE_HAUL (truck/van) + 1-2 LAST_MILE (bike)
// Each local hub: 1 LAST_MILE agent
const agentSpecs = [
  // ── Maharashtra ──
  { name: 'Ravi Patil',       phone: '9100000001', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Mumbai' },
  { name: 'Suresh More',      phone: '9100000002', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Mumbai' },
  { name: 'Amit Shah',        phone: '9100000003', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Mumbai' },
  { name: 'Priya Joshi',      phone: '9100000004', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Mumbai' },
  { name: 'Tanvi Kulkarni',   phone: '9100000005', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Pune' },
  { name: 'Ganesh Wagh',      phone: '9100000006', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Nashik' },
  { name: 'Pravin Meshram',   phone: '9100000007', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Nagpur' },

  // ── Gujarat ──
  { name: 'Hardik Patel',     phone: '9100000010', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Ahmedabad' },
  { name: 'Krupa Shah',       phone: '9100000011', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Ahmedabad' },
  { name: 'Jayesh Desai',     phone: '9100000012', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Surat' },
  { name: 'Nisha Rathod',     phone: '9100000013', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Vadodara' },

  // ── Delhi / NCR ──
  { name: 'Vikram Singh',     phone: '9100000020', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Delhi' },
  { name: 'Neha Gupta',       phone: '9100000021', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Delhi' },
  { name: 'Rohit Sharma',     phone: '9100000022', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Delhi' },

  // ── Uttar Pradesh ──
  { name: 'Anil Yadav',       phone: '9100000025', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Lucknow' },
  { name: 'Preeti Mishra',    phone: '9100000026', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Lucknow' },
  { name: 'Saurabh Tiwari',   phone: '9100000027', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Noida' },
  { name: 'Mohd Irfan',       phone: '9100000028', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Varanasi' },
  { name: 'Ramesh Yadav',     phone: '9100000029', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Agra' },

  // ── Rajasthan ──
  { name: 'Mahendra Shekhawat', phone: '9100000030', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Jaipur' },
  { name: 'Kavita Rathore',   phone: '9100000031', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Jaipur' },
  { name: 'Bharat Gehlot',    phone: '9100000032', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Jodhpur' },
  { name: 'Laxmi Meena',      phone: '9100000033', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Udaipur' },

  // ── Punjab / Haryana ──
  { name: 'Gurpreet Kaur',    phone: '9100000035', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Chandigarh' },
  { name: 'Mandeep Singh',    phone: '9100000036', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Chandigarh' },
  { name: 'Harjinder Gill',   phone: '9100000037', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Ludhiana' },
  { name: 'Rajwinder Kaur',   phone: '9100000038', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Amritsar' },

  // ── Karnataka ──
  { name: 'Kiran Reddy',      phone: '9100000040', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Bangalore' },
  { name: 'Deepa Nair',       phone: '9100000041', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Bangalore' },
  { name: 'Naveen Gowda',     phone: '9100000042', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Bangalore' },
  { name: 'Arjun Kumar',      phone: '9100000043', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Mysore' },
  { name: 'Shreedhar Rao',    phone: '9100000044', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Hubli' },
  { name: 'Prashanth Shetty', phone: '9100000045', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Mangalore' },

  // ── Tamil Nadu ──
  { name: 'Selvaraj K',       phone: '9100000050', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Chennai' },
  { name: 'Murugan S',        phone: '9100000051', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Chennai' },
  { name: 'Kavitha R',        phone: '9100000052', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Coimbatore' },
  { name: 'Senthil M',        phone: '9100000053', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Madurai' },
  { name: 'Ranjith P',        phone: '9100000054', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Trichy' },

  // ── Telangana ──
  { name: 'Srinivas Reddy',   phone: '9100000055', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Hyderabad' },
  { name: 'Anusha Reddy',     phone: '9100000056', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Hyderabad' },
  { name: 'Ramesh Kummari',   phone: '9100000057', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Warangal' },

  // ── Andhra Pradesh ──
  { name: 'Venkat Rao',       phone: '9100000058', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Vijayawada' },
  { name: 'Suresh Naidu',     phone: '9100000059', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Vijayawada' },
  { name: 'Pranav Naidu',     phone: '9100000060', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Vizag' },
  { name: 'Lakshmi Devi',     phone: '9100000061', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Tirupati' },

  // ── Kerala ──
  { name: 'Thomas Mathew',    phone: '9100000065', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Kochi' },
  { name: 'Anjali Menon',     phone: '9100000066', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Kochi' },
  { name: 'Vishnu Pillai',    phone: '9100000067', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Trivandrum' },
  { name: 'Faisal K',         phone: '9100000068', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Kozhikode' },

  // ── West Bengal ──
  { name: 'Sourav Das',       phone: '9100000070', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Kolkata' },
  { name: 'Priya Mukherjee',  phone: '9100000071', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Kolkata' },
  { name: 'Bijoy Sarkar',     phone: '9100000072', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Siliguri' },
  { name: 'Anup Ghosh',       phone: '9100000073', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Durgapur' },

  // ── Bihar ──
  { name: 'Rajesh Prasad',    phone: '9100000075', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Patna' },
  { name: 'Suman Kumar',      phone: '9100000076', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Patna' },
  { name: 'Ajay Thakur',      phone: '9100000077', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Gaya' },

  // ── Odisha ──
  { name: 'Debasis Sahoo',    phone: '9100000080', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Bhubaneswar' },
  { name: 'Smita Panda',      phone: '9100000081', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Bhubaneswar' },
  { name: 'Manoj Jena',       phone: '9100000082', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Cuttack' },

  // ── Jharkhand ──
  { name: 'Dinesh Mahto',     phone: '9100000083', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Ranchi' },
  { name: 'Seema Kumari',     phone: '9100000084', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Ranchi' },

  // ��─ Madhya Pradesh ──
  { name: 'Rajendra Jain',    phone: '9100000085', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubCity: 'Bhopal' },
  { name: 'Sunita Yadav',     phone: '9100000086', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Bhopal' },
  { name: 'Yash Agarwal',     phone: '9100000087', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Indore' },
  { name: 'Raghav Tiwari',    phone: '9100000088', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Jabalpur' },

  // ── Chhattisgarh ──
  { name: 'Bhupesh Sahu',     phone: '9100000089', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Raipur' },
  { name: 'Savita Verma',     phone: '9100000090', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Raipur' },

  // ── Goa ──
  { name: 'Rohan Naik',       phone: '9100000091', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Panaji' },

  // ── Uttarakhand ──
  { name: 'Pankaj Rawat',     phone: '9100000092', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Dehradun' },
  { name: 'Meena Bisht',      phone: '9100000093', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Dehradun' },
  { name: 'Amit Chauhan',     phone: '9100000094', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Haridwar' },

  // ── Himachal Pradesh ──
  { name: 'Vikram Thakur',    phone: '9100000095', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Shimla' },

  // ── J&K ──
  { name: 'Tariq Ahmed',      phone: '9100000096', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Jammu' },
  { name: 'Bilal Mir',        phone: '9100000097', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Srinagar' },

  // ── Northeast ──
  { name: 'Bhaskar Deka',     phone: '9100000100', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubCity: 'Guwahati' },
  { name: 'Rupali Bora',      phone: '9100000101', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Guwahati' },
  { name: 'Pranjal Hazarika', phone: '9100000102', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Dibrugarh' },
  { name: 'Laishram Singh',   phone: '9100000103', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Imphal' },
  { name: 'Banri Lyngdoh',    phone: '9100000104', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Shillong' },
  { name: 'Tenzin Lepcha',    phone: '9100000105', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Gangtok' },
  { name: 'Biplab Deb',       phone: '9100000106', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Agartala' },
  { name: 'Lalnunmawia',      phone: '9100000107', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Aizawl' },
  { name: 'Ato Yeptho',       phone: '9100000108', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Kohima' },
  { name: 'Tamo Riba',        phone: '9100000109', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubCity: 'Itanagar' },
]

// Phase 2 status pools — split by route type so seeded orders never have unreachable statuses
const urbanStatusPool = [
  ...Array(5).fill('PENDING'),
  ...Array(4).fill('CONFIRMED'),
  ...Array(6).fill('AT_MAIN_HUB'),
  ...Array(7).fill('OUT_FOR_DELIVERY'),
  ...Array(15).fill('DELIVERED'),
  ...Array(3).fill('CANCELLED'),
]
const semiUrbanStatusPool = [
  ...Array(4).fill('PENDING'),
  ...Array(3).fill('CONFIRMED'),
  ...Array(5).fill('AT_MAIN_HUB'),
  ...Array(5).fill('IN_TRANSIT_TO_LOCAL_HUB'),
  ...Array(5).fill('AT_LOCAL_HUB'),
  ...Array(6).fill('OUT_FOR_DELIVERY'),
  ...Array(12).fill('DELIVERED'),
  ...Array(3).fill('CANCELLED'),
]

const POST_HUB_URBAN = new Set(['AT_MAIN_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'])
const POST_HUB_SEMI = new Set(['AT_MAIN_HUB', 'IN_TRANSIT_TO_LOCAL_HUB', 'AT_LOCAL_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'])

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

type SeedHub = { id: string; name: string; city: string; type: string; lat: number; lng: number }

function findNearestMainHub(city: string, mainHubs: SeedHub[]): SeedHub {
  // exact city match first
  const direct = mainHubs.find((h) => city.toLowerCase().includes(h.city.toLowerCase()))
  if (direct) return direct
  const coords = getCoords(city)
  if (!coords) return mainHubs[0]
  let nearest = mainHubs[0]
  let min = Infinity
  for (const h of mainHubs) {
    const d = haversine(coords[0], coords[1], h.lat, h.lng)
    if (d < min) { min = d; nearest = h }
  }
  return nearest
}

async function main() {
  console.log('Clearing existing data (orders → agents → hubs → vendors)...')
  await prisma.order.deleteMany()
  await prisma.deliveryAgent.deleteMany()
  await prisma.hub.deleteMany()
  await prisma.vendor.deleteMany()

  // ── HUBS ────────────────────────────────────────────────────────────
  console.log('Creating main hubs...')
  const mainHubs: SeedHub[] = []
  for (const m of mainHubsData) {
    const { state, ...hubData } = m
    const h = await prisma.hub.create({ data: { ...hubData, type: 'MAIN' } })
    mainHubs.push(h as SeedHub)
    console.log(`  + ${h.name} (${state})`)
  }

  console.log('Creating local hubs...')
  const localHubs: SeedHub[] = []
  for (const l of localHubsData) {
    const parent = mainHubs.find((m) => m.city.toLowerCase() === l.parentCity.toLowerCase())!
    const h = await prisma.hub.create({
      data: { name: l.name, city: l.city, type: 'LOCAL', parentId: parent.id, lat: l.lat, lng: l.lng },
    })
    localHubs.push(h as SeedHub)
    console.log(`  + ${h.name} (under ${parent.name})`)
  }

  const allHubs = [...mainHubs, ...localHubs]

  // ── AGENTS ──────────────────────────────────────────────────────────
  console.log('\nCreating delivery agents...')
  const createdAgents = []
  for (const a of agentSpecs) {
    const hub = allHubs.find((h) => h.city.toLowerCase() === a.hubCity.toLowerCase())
    if (!hub) {
      console.warn(`  ! No hub for agent ${a.name} (${a.hubCity})`)
      continue
    }
    const agent = await prisma.deliveryAgent.create({
      data: {
        name: a.name,
        phone: a.phone,
        vehicle: a.vehicle,
        agentType: a.agentType,
        hubId: hub.id,
      },
    })
    createdAgents.push(agent)
  }
  console.log(`  + ${createdAgents.length} agents created`)

  // ── VENDORS ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(VENDOR_PASSWORD, 10)
  console.log('\nCreating vendors...')
  const createdVendors = []
  for (const v of vendors) {
    const vendor = await prisma.vendor.create({ data: { ...v, password: hashedPassword } })
    createdVendors.push(vendor)
    console.log(`  + ${vendor.companyName} (${vendor.email}) — API key: ${vendor.apiKey}`)
  }

  // ── ORDERS ──────────────────────────────────────────────────────────
  console.log('\nCreating orders with route resolution...')
  const rand = seededRandom(42)
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const totalOrders = 90

  const weights = [22, 18, 18, 16, 16] // distribution per vendor
  const vendorAssignments: number[] = []
  for (let v = 0; v < createdVendors.length; v++) {
    for (let i = 0; i < weights[v]; i++) vendorAssignments.push(v)
  }

  const usedDeliveries = new Set<number>()
  let urbanCount = 0
  let semiUrbanCount = 0
  const statusCounts: Record<string, number> = {}

  for (let i = 0; i < totalOrders; i++) {
    const vendorIdx = vendorAssignments[i % vendorAssignments.length]
    const product = pick(products[vendorIdx])
    const pickup = pick(pickups[vendorIdx])

    // Cycle through deliveries; allow reuse after exhausting
    let deliveryIdx = Math.floor(rand() * deliveries.length)
    if (usedDeliveries.size < deliveries.length) {
      while (usedDeliveries.has(deliveryIdx)) {
        deliveryIdx = (deliveryIdx + 1) % deliveries.length
      }
      usedDeliveries.add(deliveryIdx)
    }
    const delivery = deliveries[deliveryIdx]
    const priority = pick(priorities)

    // Resolve route
    const isUrban = isMainHubCity(delivery.city)
    const mainHub = findNearestMainHub(pickup.city, mainHubs)
    const status = pick(isUrban ? urbanStatusPool : semiUrbanStatusPool)
    statusCounts[status] = (statusCounts[status] || 0) + 1

    if (isUrban) urbanCount++
    else semiUrbanCount++

    // Assign agent if order has progressed past CONFIRMED
    let agentId: string | null = null
    const postHubSet = isUrban ? POST_HUB_URBAN : POST_HUB_SEMI
    if (status === 'CONFIRMED' || postHubSet.has(status)) {
      const agentType = isUrban ? 'LAST_MILE' : 'LINE_HAUL'
      const agent = createdAgents.find((a) => a.hubId === mainHub.id && a.agentType === agentType)
      if (agent) agentId = agent.id
    }

    // Phase 3 — give every dispatched order a unique agent link.
    // For OUT_FOR_DELIVERY orders, prepopulate a believable GPS pin near the
    // delivery destination so the live map looks alive in the demo even
    // before a real agent connects.
    const agentToken = agentId ? randomBytes(16).toString('hex') : null

    let agentLat: number | null = null
    let agentLng: number | null = null
    let agentLastSeen: Date | null = null
    if (status === 'OUT_FOR_DELIVERY') {
      const dCoords = getCoords(delivery.city)
      if (dCoords) {
        // Offset by ~1–2 km in a deterministic direction so a polyline shows.
        const jitterLat = (rand() - 0.5) * 0.025
        const jitterLng = (rand() - 0.5) * 0.025
        agentLat = dCoords[0] + jitterLat
        agentLng = dCoords[1] + jitterLng
        agentLastSeen = new Date(Date.now() - Math.floor(rand() * 60_000))
      }
    }
    const deliveredAt = status === 'DELIVERED' ? new Date(Date.now() - Math.floor(rand() * 86_400_000)) : null

    // Phase 4 — snapshot pricing on every seeded order
    const pricing = calculatePrice({
      pickupCity: pickup.city,
      deliveryCity: delivery.city,
      weight: product.weight,
      priority,
      isUrban,
    })

    await prisma.order.create({
      data: {
        vendorId: createdVendors[vendorIdx].id,
        description: product.description,
        weight: product.weight,
        priority,
        pickupAddress: pickup.address,
        pickupCity: pickup.city,
        pickupPincode: pickup.pincode,
        pickupContact: pickup.contact,
        pickupPhone: pickup.phone,
        deliveryAddress: delivery.address,
        deliveryCity: delivery.city,
        deliveryPincode: delivery.pincode,
        customerName: delivery.name,
        customerPhone: delivery.phone,
        customerEmail: delivery.email,
        status,
        isUrban,
        assignedHubId: mainHub.id,
        agentId,
        agentToken,
        agentLat,
        agentLng,
        agentLastSeen,
        deliveredAt,
        zone: pricing.zone,
        chargeableWeight: pricing.chargeableWeight,
        baseRate: pricing.baseRate,
        weightCharge: pricing.weightCharge,
        surcharge: pricing.surcharge,
        priorityMultiplier: pricing.priorityMultiplier,
        fuelSurcharge: pricing.fuelSurcharge,
        totalPrice: pricing.total,
      },
    })
  }
  console.log(`  + ${totalOrders} orders created`)

  // ── SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n--- Seed Summary ---')
  console.log(`Hubs:    ${mainHubs.length} main + ${localHubs.length} local`)
  console.log(`Agents:  ${createdAgents.length}`)
  console.log(`Vendors: ${createdVendors.length}`)
  console.log(`Orders:  ${totalOrders} (${urbanCount} urban, ${semiUrbanCount} semi-urban)`)

  console.log('\nOrders by status:')
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log(`  ${status.padEnd(24)} ${count}`)
  }

  console.log('\nVendor accounts:')
  console.log(`  Password for all: ${VENDOR_PASSWORD}`)
  console.log('')
  for (const v of createdVendors) {
    console.log(`  ${v.companyName.padEnd(16)} | ${v.email.padEnd(28)} | API key: ${v.apiKey}`)
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
    pool.end()
  })
