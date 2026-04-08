
const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const privacy = `# Privacy Policy
At Perambur Sri Srinivasa Sweets and Snacks, we are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.

## Information We Collect
- Personal information such as name, contact details, and payment information when you place an order.
- Non-personal information like browsing data for website analytics.

## How We Use Your Information
- To process and deliver your orders.
- To improve our website and services based on user feedback.
- To send promotional offers (with your consent).

## Data Sharing
We do not share your personal information with third parties, except for payment processing or legal requirements.

## Cookies
Our website uses cookies to enhance your browsing experience. You can disable cookies in your browser settings.

## Data Security
We implement secure systems to protect your data from unauthorized access.

## Your Rights
You can request to view, update, or delete your personal information by contacting us.

## Policy Updates
This Privacy Policy may be updated periodically. Please review it regularly.

## Contact Us
For privacy-related concerns, email us at: info@perambursrinivasa.com or call +91 92824 45577.`;

  const terms = `# Terms & Conditions
Welcome to Perambur Sri Srinivasa Sweets and Snacks. By accessing or using our website, you agree to comply with and be bound by the following terms and conditions.

## proprietorship
The website Perambur Sri Srinivasa Sweets and Snacks is owned and operated by Perambur Sri Srinivasa Sweets and Snacks.

## Acceptance of Terms
By using this website, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website.

## Product Availability
While we strive to ensure that all products listed on the website are available, we cannot guarantee stock at all times. In the event of unavailability, we will inform you as soon as possible.

## Pricing and Payment
All prices are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to change prices without prior notice. Payment must be made in full at the time of ordering.

## Order Cancellation and Refunds
Orders can be cancelled within a limited timeframe after placement. After this period, no cancellations will be accepted. Refunds for cancelled orders or damaged products will be processed as per our internal policies.

## Intellectual Property
All content on this website, including text, graphics, logos, and images, is the property of Perambur Sri Srinivasa Sweets and Snacks and is protected by intellectual property laws.

## Limitation of Liability
Perambur Sri Srinivasa Sweets and Snacks shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services.

## Governing Law
These Terms and Conditions are governed by the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Chennai.`;

  const refund = `# Refund Policy
At Perambur Sri Srinivasa Sweets and Snacks, we take great pride in the quality of our products. Due to the perishable nature of our sweets and snacks, our refund policy is designed to be fair while ensuring food safety.

## Refunds & Returns
We generally do not accept returns for food products once they have been delivered, except in cases where:
- The product received is damaged or tampered with.
- The product received is past its expiry date at the time of delivery.
- The wrong item was delivered.

## How to Request a Refund
If you receive a product that meets any of the criteria above, please:
1. Contact us within 24 hours of delivery.
2. Provide your order number and clear photographs of the issue.
3. Email details to info@perambursrinivasa.com.

## Cancellation Policy
Orders can be cancelled only before they are dispatched. Once the order has been handed over to our delivery partner, cancellations are not possible.

## Non-Refundable Situations
Refunds will not be issued in the following cases:
- Incorrect or incomplete shipping address provided by the customer.
- The recipient is unavailable at the time of delivery after multiple attempts.
- Minor taste/texture variations (as our products are handcrafted).

## Processing Time
Approved refunds will be processed within 5-7 business days and will be credited back to the original payment method used during the purchase.`;

  const shipping = `# Shipping Policy
By placing an order through our Website, you agree to the terms outlined below. These terms are intended to clearly define mutual responsibilities and set expectations to ensure a smooth and transparent transaction.

## 1. Delivery Terms
- **Chennai**: 1 to 2 business days
- **Rest of Tamil Nadu (ROTN)**: 2 to 3 business days
- **Rest of India (ROI)**: 3 to 4 business days
- **Remote Locations**: 8 to 9 business days

## 2. Shipping Charges
Shipping costs are calculated during the checkout process based on the weight, size, and destination of your order. These charges are collected at the time of purchase and represent the final cost for shipping.

## 3. Stock Availability
All orders are processed subject to product availability. If we are unable to fulfill your entire order, we will ship the available items and contact you regarding the restock or refund.

## 4. Shipment Tracking
Once your order has been dispatched, you will receive a tracking link to monitor your shipment in real-time.

## 5. Damaged or Lost Shipments
If you receive a damaged package, please refuse the delivery (if possible) and notify us immediately. In cases where a package is confirmed lost by the courier, we will initiate a refund or replacement.`;

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      privacy_content: privacy,
      terms_content: terms,
      refund_content: refund,
      shipping_content: shipping
    },
    create: {
      id: 'default',
      privacy_content: privacy,
      terms_content: terms,
      refund_content: refund,
      shipping_content: shipping
    }
  });

  console.log('Policy contents seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
