import { StatusCodes } from "http-status-codes";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { calculatePopularityScore } from "../utils/productUtils.js";

export const getDashboardStats = async (_req, res) => {
  const [
    totalProducts,
    totalOrders,
    lowStockItems,
    recentOrders,
    dailyRevenue,
    topSellingProducts,
    orderStatusBreakdown,
    revenueSummary,
    productAnalytics
  ] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    Product.find({ stock: { $lt: 5 } })
      .sort({ stock: 1, updatedAt: -1 })
      .limit(10)
      .select("name slug category fabric color colors price stock images isNewArrival")
      .lean(),
    Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ["PAYMENT_FAILED", "CANCELLED"] } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 14 }
    ]),
    Product.find()
      .sort({ soldCount: -1, views: -1 })
      .limit(6)
      .select("name soldCount price images category popularityScore analytics")
      .lean(),
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ["PAYMENT_FAILED", "CANCELLED"] } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]),
    Product.find()
      .sort({ popularityScore: -1, views: -1 })
      .limit(8)
      .select("name category fabric images price stock views soldCount analytics isNewArrival")
      .lean()
  ]);

  const normalizedProductAnalytics = productAnalytics.map((product) => ({
    ...product,
    interestScore: calculatePopularityScore(product)
  }));

  return res.status(StatusCodes.OK).json({
    totalProducts,
    totalOrders,
    totalRevenue: revenueSummary[0]?.revenue || 0,
    averageOrderValue: Math.round(revenueSummary[0]?.avgOrderValue || 0),
    lowStockCount: lowStockItems.length,
    lowStockItems,
    recentOrders,
    dailyRevenue,
    topSellingProducts,
    orderStatusBreakdown,
    productAnalytics: normalizedProductAnalytics
  });
};
