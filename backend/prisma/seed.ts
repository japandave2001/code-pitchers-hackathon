import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

const statuses = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
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
]

// Deterministic pseudo-random using a seed — so every dev gets the same data
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function generateOrders(vendorCount: number): Array<{
  vendorIdx: number
  description: string
  weight: number
  priority: string
  pickupAddress: string
  pickupCity: string
  pickupPincode: string
  pickupContact: string
  pickupPhone: string
  deliveryAddress: string
  deliveryCity: string
  deliveryPincode: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  status: string
}> {
  const rand = seededRandom(42)
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const totalOrders = 75

  // Distribute orders across vendors: roughly weighted
  // Amazon: ~22, Flipkart: ~18, Meesho: ~15, Myntra: ~12, Nykaa: ~8
  const weights = [22, 18, 15, 12, 8]
  const vendorAssignments: number[] = []
  for (let v = 0; v < vendorCount; v++) {
    for (let i = 0; i < weights[v]; i++) {
      vendorAssignments.push(v)
    }
  }

  // Status distribution: heavier on DELIVERED and IN_TRANSIT for realism
  const statusPool = [
    ...Array(8).fill('PENDING'),
    ...Array(6).fill('CONFIRMED'),
    ...Array(5).fill('PICKED_UP'),
    ...Array(15).fill('IN_TRANSIT'),
    ...Array(8).fill('OUT_FOR_DELIVERY'),
    ...Array(25).fill('DELIVERED'),
    ...Array(8).fill('CANCELLED'),
  ]

  const result = []
  const usedDeliveries = new Set<number>()

  for (let i = 0; i < totalOrders; i++) {
    const vendorIdx = vendorAssignments[i % vendorAssignments.length]
    const product = pick(products[vendorIdx])
    const pickup = pick(pickups[vendorIdx])

    // Cycle through deliveries to get good spread, allow reuse after exhausting all
    let deliveryIdx = Math.floor(rand() * deliveries.length)
    if (usedDeliveries.size < deliveries.length) {
      while (usedDeliveries.has(deliveryIdx)) {
        deliveryIdx = (deliveryIdx + 1) % deliveries.length
      }
      usedDeliveries.add(deliveryIdx)
    }
    const delivery = deliveries[deliveryIdx]
    const status = pick(statusPool)
    const priority = pick(priorities)

    result.push({
      vendorIdx,
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
    })
  }

  return result
}

async function main() {
  console.log('Clearing existing data...')
  await prisma.order.deleteMany()
  await prisma.vendor.deleteMany()

  const hashedPassword = await bcrypt.hash(VENDOR_PASSWORD, 10)

  console.log('Creating vendors...')
  const createdVendors = []
  for (const v of vendors) {
    const vendor = await prisma.vendor.create({
      data: { ...v, password: hashedPassword },
    })
    createdVendors.push(vendor)
    console.log(`  + ${vendor.companyName} (${vendor.email}) — API key: ${vendor.apiKey}`)
  }

  const orders = generateOrders(vendors.length)

  console.log('\nCreating orders...')
  for (const o of orders) {
    const { vendorIdx, ...data } = o
    await prisma.order.create({
      data: {
        ...data,
        vendorId: createdVendors[vendorIdx].id,
      },
    })
  }
  console.log(`  + ${orders.length} orders created`)

  // Print summary
  console.log('\n--- Seed Summary ---')
  console.log(`Vendors: ${createdVendors.length}`)
  console.log(`Orders:  ${orders.length}`)

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }
  console.log('\nOrders by status:')
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log(`  ${status.padEnd(20)} ${count}`)
  }

  // Per-vendor breakdown
  console.log('\nVendor accounts:')
  console.log(`  Password for all: ${VENDOR_PASSWORD}`)
  console.log('')
  for (let i = 0; i < createdVendors.length; i++) {
    const v = createdVendors[i]
    const vendorOrders = orders.filter((o) => o.vendorIdx === i)
    console.log(`  ${v.companyName.padEnd(16)} | ${v.email.padEnd(28)} | ${String(vendorOrders.length).padStart(2)} orders | API key: ${v.apiKey}`)
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
