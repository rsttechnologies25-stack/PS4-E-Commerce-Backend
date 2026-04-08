const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

const PRIVACY_POLICY = `
# Privacy Policy

Last Updated: March 2026

At Perambur Sri Srinivasa Sweets & Snacks (PS4), we value your privacy. This policy describes how we collect, use, and handle your information.

## 1. Information Collection
We collect information you provide directly to us when creating an account, placing an order, or contacting customer support.

## 2. Information Usage
We use your information to process orders, improve our services, and communicate updates or promotions.

## 3. Data Protection
We implement industry-standard security measures to protect your personal data from unauthorized access.

## 4. Contact Us
For any privacy-related queries, please contact us at care@perambursrinivasa.com.
`;

const TERMS_CONDITIONS = `
# Terms & Conditions

Welcome to PS4. By using our website or mobile app, you agree to these terms.

## 1. Ordering & Payments
All orders are subject to availability. Payments must be made through our authorized payment gateways.

## 2. Delivery
We strive to deliver within the estimated timelines. However, delays may occur due to unforeseen circumstances.

## 3. User Conduct
Users are expected to provide accurate information and maintain the confidentiality of their accounts.

## 4. Governing Law
These terms are governed by the laws of India and exclusive jurisdiction of Chennai courts.
`;

const SHIPPING_POLICY = `
# Shipping Policy

## 1. Order Processing
- Chennai Orders: Orders placed before 3:00 PM are processed for next-day delivery.
- Rest of India: Orders are dispatched within 24-48 hours.

## 2. Shipping Charges
Shipping charges are calculated based on order weight and delivery location (Chennai / Tamil Nadu / Rest of India).

## 3. Delivery Timelines
- Chennai: 1-2 days
- Rest of India: 3-7 days depending on the location.

## 4. Packaging
All sweets and snacks are packed in clean, hygienic, and damage-resistant packaging to ensure freshness.
`;

const REFUND_POLICY = `
# Refund & Cancellation Policy

## 1. Cancellations
Orders can only be cancelled within 1 hour of placement, as we process fresh items quickly.

## 2. Damaged Products
If you receive a damaged or incorrect product, please notify us within 24 hours of delivery with photos at care@perambursrinivasa.com.

## 3. Refunds
Approved refunds will be processed back to the original payment method within 5-7 business days.

## 4. Perishable Items
Due to the perishable nature of our products, we do not accept returns.
`;

async function main() {
  try {
    console.log('Updating policy content in database...');
    
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: {
        privacy_content: PRIVACY_POLICY,
        terms_content: TERMS_CONDITIONS,
        shipping_content: SHIPPING_POLICY,
        refund_content: REFUND_POLICY,
      },
      create: {
        id: 'default',
        privacy_content: PRIVACY_POLICY,
        terms_content: TERMS_CONDITIONS,
        shipping_content: SHIPPING_POLICY,
        refund_content: REFUND_POLICY,
      }
    });
    
    console.log('Successfully updated policies!');
    console.log(settings);
  } catch (e) {
    console.error('Error updating policies:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
