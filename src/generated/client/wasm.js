
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.2.1
 * Query Engine version: 4123509d24aa4dede1e864b46351bf2790323b69
 */
Prisma.prismaVersion = {
  client: "6.2.1",
  engine: "4123509d24aa4dede1e864b46351bf2790323b69"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  image: 'image',
  parentId: 'parentId',
  deliveryInfo: 'deliveryInfo'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  price: 'price',
  weight: 'weight',
  image: 'image',
  categoryId: 'categoryId',
  isBestSeller: 'isBestSeller',
  isNewLaunch: 'isNewLaunch',
  createdAt: 'createdAt',
  deliveryInfo: 'deliveryInfo',
  isSoldOut: 'isSoldOut'
};

exports.Prisma.ProductImageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  url: 'url',
  altText: 'altText',
  isPrimary: 'isPrimary',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  weight: 'weight',
  price: 'price',
  stock: 'stock',
  isDefault: 'isDefault',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  name: 'name',
  address: 'address',
  city: 'city',
  phone: 'phone',
  image: 'image',
  isHeadOffice: 'isHeadOffice',
  latitude: 'latitude',
  longitude: 'longitude'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  message: 'message',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HeroBannerScalarFieldEnum = {
  id: 'id',
  image: 'image',
  title: 'title',
  subtitle: 'subtitle',
  ctaText: 'ctaText',
  linkType: 'linkType',
  productId: 'productId',
  categoryId: 'categoryId',
  customUrl: 'customUrl',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  slideInterval: 'slideInterval',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  customerName: 'customerName',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt',
  isVerified: 'isVerified',
  productId: 'productId',
  status: 'status',
  updatedAt: 'updatedAt',
  userId: 'userId',
  adminReply: 'adminReply',
  repliedAt: 'repliedAt'
};

exports.Prisma.SiteSettingsScalarFieldEnum = {
  id: 'id',
  deliveryPopupEnabled: 'deliveryPopupEnabled',
  deliveryPopupTitle: 'deliveryPopupTitle',
  deliveryPopupContent: 'deliveryPopupContent',
  updatedAt: 'updatedAt',
  whatsappNumber: 'whatsappNumber',
  aboutPageContent: 'aboutPageContent',
  contactPageContent: 'contactPageContent',
  privacy_content: 'privacy_content',
  terms_content: 'terms_content',
  shipping_content: 'shipping_content',
  refund_content: 'refund_content',
  splashContent: 'splashContent',
  dispatchCutoffHour: 'dispatchCutoffHour',
  dispatchSundayPolicy: 'dispatchSundayPolicy',
  dispatchLimitText: 'dispatchLimitText'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  customerName: 'customerName',
  phoneNumber: 'phoneNumber',
  pincode: 'pincode',
  state: 'state',
  fcmToken: 'fcmToken',
  isBanned: 'isBanned',
  adminNotes: 'adminNotes'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  weight: 'weight',
  quantity: 'quantity',
  variantId: 'variantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  couponCode: 'couponCode',
  discountAmount: 'discountAmount',
  shippingCharge: 'shippingCharge',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  customerName: 'customerName',
  phoneNumber: 'phoneNumber',
  pincode: 'pincode',
  razorpayOrderId: 'razorpayOrderId',
  razorpayPaymentId: 'razorpayPaymentId',
  razorpaySignature: 'razorpaySignature',
  paymentStatus: 'paymentStatus',
  deliveryManName: 'deliveryManName',
  deliveryManPhone: 'deliveryManPhone',
  trackingId: 'trackingId',
  trackingLink: 'trackingLink',
  deliveredAt: 'deliveredAt',
  feedbackSentAt: 'feedbackSentAt',
  whatsappDeliveredSent: 'whatsappDeliveredSent',
  whatsappFeedbackSent: 'whatsappFeedbackSent',
  whatsappOrderSent: 'whatsappOrderSent',
  whatsappShippedSent: 'whatsappShippedSent'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  productName: 'productName',
  weight: 'weight',
  price: 'price',
  quantity: 'quantity'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  type: 'type',
  value: 'value',
  minCartAmount: 'minCartAmount',
  isActive: 'isActive',
  expiryDate: 'expiryDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShippingRuleScalarFieldEnum = {
  id: 'id',
  areaName: 'areaName',
  pincodes: 'pincodes',
  baseWeightLimit: 'baseWeightLimit',
  baseCharge: 'baseCharge',
  additionalChargePerKg: 'additionalChargePerKg',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryPairingScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  pairedCategoryId: 'pairedCategoryId',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  isAdmin: 'isAdmin',
  priority: 'priority',
  type: 'type',
  message: 'message',
  orderId: 'orderId',
  isRead: 'isRead',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BannedEmailScalarFieldEnum = {
  id: 'id',
  email: 'email',
  createdAt: 'createdAt'
};

exports.Prisma.WhatsAppTemplateScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  message: 'message',
  isActive: 'isActive',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Admin: 'Admin',
  Category: 'Category',
  Product: 'Product',
  ProductImage: 'ProductImage',
  ProductVariant: 'ProductVariant',
  Branch: 'Branch',
  Announcement: 'Announcement',
  HeroBanner: 'HeroBanner',
  Review: 'Review',
  SiteSettings: 'SiteSettings',
  User: 'User',
  CartItem: 'CartItem',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Coupon: 'Coupon',
  ShippingRule: 'ShippingRule',
  CategoryPairing: 'CategoryPairing',
  Notification: 'Notification',
  BannedEmail: 'BannedEmail',
  WhatsAppTemplate: 'WhatsAppTemplate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
