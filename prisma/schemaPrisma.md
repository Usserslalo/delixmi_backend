generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ------------------------------------
// --- Modelos de Autenticación y Permisos
// ------------------------------------

model Role {
  id                  Int                 @id @default(autoincrement())
  name                String              @unique @db.VarChar(50)
  displayName         String              @map("display_name") @db.VarChar(100)
  description         String?             @db.Text
  createdAt           DateTime            @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt           DateTime            @updatedAt @map("updated_at") @db.Timestamp(6)
  roleHasPermissions  RoleHasPermission[]
  userRoleAssignments UserRoleAssignment[]

  @@index([createdAt])
  @@map("roles")
}

model Permission {
  id                  Int                 @id @default(autoincrement())
  name                String              @unique @db.VarChar(100)
  displayName         String              @map("display_name") @db.VarChar(150)
  module              String              @db.VarChar(50)
  createdAt           DateTime            @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt           DateTime            @updatedAt @map("updated_at") @db.Timestamp(6)
  roleHasPermissions  RoleHasPermission[]

  @@index([createdAt])
  @@map("permissions")
}

model RoleHasPermission {
  roleId       Int        @map("role_id")
  permissionId Int        @map("permission_id")
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamp(6)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId], map: "role_has_permissions_permission_id_fkey")
  @@map("role_has_permissions")
}

model User {
  id                      Int                    @id @default(autoincrement())
  name                    String                 @db.VarChar(100)
  lastname                String                 @db.VarChar(100)
  email                   String                 @unique @db.VarChar(150)
  phone                   String                 @unique @db.VarChar(20)
  password                String                 @db.VarChar(255)
  emailVerifiedAt         DateTime?              @map("email_verified_at") @db.Timestamp(6)
  phoneVerifiedAt         DateTime?              @map("phone_verified_at") @db.Timestamp(6)
  phoneOtp                String?                @map("phone_otp") @db.VarChar(6)
  phoneOtpExpiresAt       DateTime?              @map("phone_otp_expires_at") @db.Timestamp(6)
  imageUrl                String?                @map("image_url") @db.VarChar(255)
  notificationToken       String?                @map("notification_token") @db.VarChar(255)
  status                  UserStatus             @default(pending)
  createdAt               DateTime               @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt               DateTime               @updatedAt @map("updated_at") @db.Timestamp(6)
  passwordResetExpiresAt  DateTime?              @map("password_reset_expires_at") @db.Timestamp(6)
  passwordResetToken      String?                @unique @map("password_reset_token")
  addresses               Address[]
  carts                   Cart[]
  driverProfile           DriverProfile?
  driverWallet            DriverWallet?
  ordersAsCustomer        Order[]                @relation("CustomerOrders")
  ordersAsDriver          Order[]                @relation("DriverOrders")
  refreshTokens           RefreshToken[]
  restaurantOwned         Restaurant?
  userRoleAssignments     UserRoleAssignment[]
  auditLogs               AuditLog[]

  @@index([status])
  @@index([createdAt])
  @@map("users")
}

model UserRoleAssignment {
  id           Int          @id @default(autoincrement())
  userId       Int          @map("user_id")
  roleId       Int          @map("role_id")
  restaurantId Int?         @map("restaurant_id")
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime     @updatedAt @map("updated_at") @db.Timestamp(6)
  restaurant   Restaurant?  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  role         Role         @relation(fields: [roleId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([restaurantId], map: "user_role_assignments_restaurant_id_fkey")
  @@index([roleId], map: "user_role_assignments_role_id_fkey")
  @@index([userId], map: "user_role_assignments_user_id_fkey")
  @@map("user_role_assignments")
}

// ------------------------------------
// --- Modelo de Restaurante (Ubicación Única)
// ------------------------------------

model Restaurant {
  id                        Int                         @id @default(autoincrement())
  ownerId                   Int                         @unique @map("owner_id")
  name                      String                      @db.VarChar(150)
  description               String?                     @db.Text
  logoUrl                   String?                     @map("logo_url") @db.VarChar(255)
  coverPhotoUrl             String?                     @map("cover_photo_url") @db.VarChar(255)
  commissionRate            Decimal                     @default(10.00) @map("commission_rate") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  status                    RestaurantStatus            @default(pending_approval)
  createdAt                 DateTime                    @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt                 DateTime                    @updatedAt @map("updated_at") @db.Timestamp(6)
  rating                    Float?                      @default(0)
  category                  String?                     @db.VarChar(50)
  address                   String?                     @db.Text
  email                     String?                     @db.VarChar(150)
  phone                     String?                     @db.VarChar(20)
  latitude                  Decimal?                    @db.Decimal(10, 8) // Mantiene (10, 8)
  longitude                 Decimal?                    @db.Decimal(11, 8) // Mantiene (11, 8)
  uses_platform_drivers     Boolean                     @default(true)
  delivery_fee              Decimal                     @default(25.00) @db.Decimal(10, 2) // Estandarizado a (10, 2)
  delivery_radius           Decimal                     @default(5.00) @db.Decimal(10, 2) // Estandarizado a (10, 2)
  estimated_delivery_max    Int                         @default(35)
  estimated_delivery_min    Int                         @default(25)
  modifierGroups            ModifierGroup[]
  carts                     Cart[]
  products                  Product[]
  wallet                    RestaurantWallet?
  owner                     User                        @relation(fields: [ownerId], references: [id])
  subcategories             Subcategory[]
  userRoleAssignments       UserRoleAssignment[]
  orders                    Order[]                     @relation("RestaurantOrders")

  @@index([ownerId], map: "restaurants_owner_id_fkey")
  @@index([status])
  @@index([createdAt])
  @@map("restaurants")
}

// ------------------------------------
// --- Modelos de Menú
// ------------------------------------

model Category {
  id            Int           @id @default(autoincrement())
  name          String        @unique @db.VarChar(100)
  imageUrl      String?       @map("image_url") @db.VarChar(255)
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime      @updatedAt @map("updated_at") @db.Timestamp(6)
  subcategories Subcategory[]

  @@map("categories")
}

model Subcategory {
  id             Int          @id @default(autoincrement())
  restaurantId   Int          @map("restaurant_id")
  categoryId     Int          @map("category_id")
  name           String       @db.VarChar(100)
  displayOrder   Int          @default(0) @map("display_order")
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime     @updatedAt @map("updated_at") @db.Timestamp(6)
  products       Product[]
  category       Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  restaurant     Restaurant   @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@unique([restaurantId, categoryId, name])
  @@index([categoryId], map: "subcategories_category_id_fkey")
  @@map("subcategories")
}

model Product {
  id               Int                 @id @default(autoincrement())
  restaurantId     Int                 @map("restaurant_id")
  subcategoryId    Int                 @map("subcategory_id")
  name             String              @db.VarChar(150)
  description      String?             @db.Text
  imageUrl         String?             @map("image_url") @db.VarChar(255)
  price            Decimal             @db.Decimal(10, 2) // Estandarizado a (10, 2)
  isAvailable      Boolean             @default(true) @map("is_available")
  createdAt        DateTime            @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt        DateTime            @updatedAt @map("updated_at") @db.Timestamp(6)
  tags             String?             @db.Text
  modifierGroups   ProductModifier[]
  cartItems        CartItem[]
  orderItems       OrderItem[]
  restaurant       Restaurant          @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  subcategory      Subcategory         @relation(fields: [subcategoryId], references: [id], onDelete: Cascade)

  @@index([restaurantId], map: "products_restaurant_id_fkey")
  @@index([subcategoryId], map: "products_subcategory_id_fkey")
  @@map("products")
}

// ------------------------------------
// --- Modelos de Modificadores
// ------------------------------------

model ModifierGroup {
  id             Int              @id @default(autoincrement())
  name           String
  restaurantId   Int
  minSelection   Int              @default(1)
  maxSelection   Int              @default(1)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  restaurant     Restaurant       @relation(fields: [restaurantId], references: [id])
  options        ModifierOption[]
  products       ProductModifier[]

  @@index([restaurantId], map: "ModifierGroup_restaurantId_fkey")
  @@map("modifier_groups") // Nombre SQL consistente
}

model ModifierOption {
  id                  Int                 @id @default(autoincrement())
  name                String
  price               Decimal             @db.Decimal(10, 2) // Estandarizado a (10, 2)
  modifierGroupId     Int
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  modifierGroup       ModifierGroup       @relation(fields: [modifierGroupId], references: [id])
  cartItemModifiers   CartItemModifier[]
  orderItemModifiers  OrderItemModifier[]

  @@index([modifierGroupId], map: "ModifierOption_modifierGroupId_fkey")
  @@map("modifier_options") // Nombre SQL consistente
}

model ProductModifier {
  productId         Int
  modifierGroupId   Int
  modifierGroup     ModifierGroup @relation(fields: [modifierGroupId], references: [id])
  product           Product       @relation(fields: [productId], references: [id])

  @@id([productId, modifierGroupId])
  @@index([modifierGroupId], map: "ProductModifier_modifierGroupId_fkey")
}

// ------------------------------------
// --- Modelos de Carrito
// ------------------------------------

model Cart {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  restaurantId Int      @map("restaurant_id")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  items        CartItem[]
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, restaurantId])
  @@index([restaurantId], map: "carts_restaurant_id_fkey")
  @@map("carts")
}

model CartItem {
  id           Int                @id @default(autoincrement())
  cartId       Int                @map("cart_id")
  productId    Int                @map("product_id")
  quantity     Int                @default(1)
  priceAtAdd   Decimal            @map("price_at_add") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime           @updatedAt @map("updated_at") @db.Timestamp(6)
  modifiers    CartItemModifier[]
  cart         Cart               @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product      Product            @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([cartId, productId])
  @@index([productId], map: "cart_items_product_id_fkey")
  @@map("cart_items")
}

model CartItemModifier {
  id               Int              @id @default(autoincrement())
  cartItemId       Int              @map("cart_item_id")
  modifierOptionId Int              @map("modifier_option_id")
  cartItem         CartItem         @relation(fields: [cartItemId], references: [id], onDelete: Cascade)
  modifierOption   ModifierOption   @relation(fields: [modifierOptionId], references: [id])

  @@index([cartItemId], map: "cart_item_modifiers_cart_item_id_fkey")
  @@index([modifierOptionId], map: "cart_item_modifiers_modifier_option_id_fkey")
  @@map("cart_item_modifiers")
}

// ------------------------------------
// --- Modelos de Pedidos y Pagos
// ------------------------------------

model Address {
  id             Int      @id @default(autoincrement())
  userId         Int      @map("user_id")
  alias          String   @db.VarChar(50)
  street         String   @db.VarChar(255)
  exteriorNumber String   @map("exterior_number") @db.VarChar(50)
  interiorNumber String?  @map("interior_number") @db.VarChar(50)
  neighborhood   String   @db.VarChar(150)
  city           String   @db.VarChar(100)
  state          String   @db.VarChar(100)
  zipCode        String   @map("zip_code") @db.VarChar(10)
  references     String?  @db.Text
  latitude       Decimal  @db.Decimal(10, 8) // Mantiene (10, 8)
  longitude      Decimal  @db.Decimal(11, 8) // Mantiene (11, 8)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders         Order[]

  @@index([userId], map: "address_user_id_fkey")
  @@map("address")
}

model Order {
  id                        BigInt                      @id @default(autoincrement())
  customerId                Int                         @map("customer_id")
  restaurantId              Int                         @map("restaurant_id")
  addressId                 Int                         @map("address_id")
  deliveryDriverId          Int?                        @map("delivery_driver_id")
  status                    OrderStatus                 @default(pending)
  subtotal                  Decimal                     @db.Decimal(10, 2) // Estandarizado a (10, 2)
  deliveryFee               Decimal                     @default(0.00) @map("delivery_fee") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  total                     Decimal                     @db.Decimal(10, 2) // Estandarizado a (10, 2)
  commissionRateSnapshot    Decimal                     @map("commission_rate_snapshot") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  platformFee               Decimal                     @map("platform_fee") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  restaurantPayout          Decimal                     @map("restaurant_payout") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  paymentId                 BigInt?                     @unique @map("payment_id")
  paymentMethod             String                      @map("payment_method") @db.VarChar(50)
  paymentStatus             PaymentStatus               @default(pending) @map("payment_status")
  orderPlacedAt             DateTime                    @default(now()) @map("order_placed_at") @db.Timestamp(6)
  orderDeliveredAt          DateTime?                   @map("order_delivered_at") @db.Timestamp(6)
  createdAt                 DateTime                    @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt                 DateTime                    @updatedAt @map("updated_at") @db.Timestamp(6)
  specialInstructions       String?                     @map("special_instructions") @db.Text
  driverWalletTransactions  DriverWalletTransaction[]
  orderItems                OrderItem[]
  address                   Address                     @relation(fields: [addressId], references: [id])
  restaurant                Restaurant                  @relation("RestaurantOrders", fields: [restaurantId], references: [id])
  customer                  User                        @relation("CustomerOrders", fields: [customerId], references: [id])
  deliveryDriver            User?                       @relation("DriverOrders", fields: [deliveryDriverId], references: [id])
  payment                   Payment?
  restaurantWalletTransactions RestaurantWalletTransaction[]

  @@index([addressId], map: "orders_address_id_fkey")
  @@index([restaurantId], map: "orders_restaurant_id_fkey")
  @@index([customerId], map: "orders_customer_id_fkey")
  @@index([deliveryDriverId], map: "orders_delivery_driver_id_fkey")
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id             BigInt              @id @default(autoincrement())
  orderId        BigInt              @map("order_id")
  productId      Int                 @map("product_id")
  quantity       Int                 @default(1)
  pricePerUnit   Decimal             @map("price_per_unit") @db.Decimal(10, 2) // Estandarizado a (10, 2)
  createdAt      DateTime            @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime            @updatedAt @map("updated_at") @db.Timestamp(6)
  modifiers      OrderItemModifier[]
  order          Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product        Product             @relation(fields: [productId], references: [id])

  @@index([orderId], map: "order_items_order_id_fkey")
  @@index([productId], map: "order_items_product_id_fkey")
  @@map("order_items")
}

model OrderItemModifier {
  id                 BigInt           @id @default(autoincrement())
  orderItemId        BigInt           @map("order_item_id")
  modifierOptionId   Int              @map("modifier_option_id")
  modifierOption     ModifierOption   @relation(fields: [modifierOptionId], references: [id])
  orderItem          OrderItem        @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([modifierOptionId], map: "order_item_modifiers_modifier_option_id_fkey")
  @@index([orderItemId], map: "order_item_modifiers_order_item_id_fkey")
  @@map("order_item_modifiers")
}

model Payment {
  id                  BigInt        @id @default(autoincrement())
  orderId             BigInt        @unique @map("order_id")
  amount              Decimal       @db.Decimal(10, 2) // Estandarizado a (10, 2)
  currency            String        @default("MXN") @db.VarChar(10)
  provider            String        @db.VarChar(50)
  providerPaymentId   String?       @unique @map("provider_payment_id") @db.VarChar(255)
  status              PaymentStatus
  createdAt           DateTime      @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt           DateTime      @updatedAt @map("updated_at") @db.Timestamp(6)
  order               Order         @relation(fields: [orderId], references: [id])

  @@map("payments")
}

// ------------------------------------
// --- Modelos de Billeteras y Drivers
// ------------------------------------

model DriverProfile {
  userId            Int          @id @map("user_id")
  vehicleType       String?      @map("vehicle_type") @db.VarChar(50)
  licensePlate      String?      @map("license_plate") @db.VarChar(20)
  status            DriverStatus @default(offline)
  currentLatitude   Decimal?     @map("current_latitude") @db.Decimal(10, 8) // Mantiene (10, 8)
  currentLongitude  Decimal?     @map("current_longitude") @db.Decimal(11, 8) // Mantiene (11, 8)
  lastSeenAt        DateTime?    @map("last_seen_at") @db.Timestamp(6)
  kycStatus         KycStatus    @default(pending) @map("kyc_status")
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime     @updatedAt @map("updated_at") @db.Timestamp(6)
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([createdAt])
  @@map("driver_profiles")
}

model RestaurantWallet {
  id           Int                         @id @default(autoincrement())
  restaurantId Int                         @unique @map("restaurant_id")
  balance      Decimal                     @default(0.00) @db.Decimal(10, 2) // Estandarizado a (10, 2)
  updatedAt    DateTime                    @updatedAt
  transactions RestaurantWalletTransaction[]
  restaurant   Restaurant                  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@map("restaurant_wallets")
}

model RestaurantWalletTransaction {
  id           BigInt          @id @default(autoincrement())
  walletId     Int             @map("wallet_id")
  orderId      BigInt?         @map("order_id")
  type         String
  amount       Decimal         @db.Decimal(10, 2) // Estandarizado a (10, 2)
  balanceAfter Decimal         @db.Decimal(10, 2) // Estandarizado a (10, 2)
  description  String?         @db.Text
  createdAt    DateTime        @default(now())
  order        Order?          @relation(fields: [orderId], references: [id])
  wallet       RestaurantWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([orderId], map: "restaurant_wallet_transactions_order_id_fkey")
  @@index([walletId], map: "restaurant_wallet_transactions_wallet_id_fkey")
  @@map("restaurant_wallet_transactions")
}

model DriverWallet {
  id           Int                         @id @default(autoincrement())
  driverId     Int                         @unique @map("driver_id")
  balance      Decimal                     @default(0.00) @db.Decimal(10, 2) // Estandarizado a (10, 2)
  updatedAt    DateTime                    @updatedAt
  transactions DriverWalletTransaction[]
  driver       User                        @relation(fields: [driverId], references: [id], onDelete: Cascade)

  @@map("driver_wallets")
}

model DriverWalletTransaction {
  id           BigInt       @id @default(autoincrement())
  walletId     Int          @map("wallet_id")
  orderId      BigInt?      @map("order_id")
  type         String
  amount       Decimal      @db.Decimal(10, 2) // Estandarizado a (10, 2)
  balanceAfter Decimal      @db.Decimal(10, 2) // Estandarizado a (10, 2)
  description  String?      @db.Text
  createdAt    DateTime     @default(now())
  order        Order?       @relation(fields: [orderId], references: [id])
  wallet       DriverWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([orderId], map: "driver_wallet_transactions_order_id_fkey")
  @@index([walletId], map: "driver_wallet_transactions_wallet_id_fkey")
  @@map("driver_wallet_transactions")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    Int      @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "refresh_tokens_user_id_fkey")
  @@map("refresh_tokens")
}

// ------------------------------------
// --- Modelo de Auditoría (Opcional)
// ------------------------------------

model AuditLog {
  id          BigInt     @id @default(autoincrement())
  userId      Int?
  action      String
  entity      String
  entityId    Int?
  details     Json?
  createdAt   DateTime   @default(now())
  user        User?      @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}

// ------------------------------------
// --- Enumeraciones
// ------------------------------------

enum UserStatus {
  pending
  active
  inactive
  suspended
  deleted
}

enum RestaurantStatus {
  pending_approval
  active
  inactive
  suspended
  rejected
}

enum OrderStatus {
  pending
  placed
  confirmed
  preparing
  ready_for_pickup
  out_for_delivery
  delivered
  cancelled
  refunded
}

enum PaymentStatus {
  pending
  processing
  completed
  failed
  cancelled
  refunded
}

enum DriverStatus {
  offline
  online
  busy
  unavailable
}

enum KycStatus {
  pending
  approved
  rejected
  under_review
}