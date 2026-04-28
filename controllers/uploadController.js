import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const uploadImages = async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
  const uploads = await Promise.all(req.files.map((file) => uploadBufferToCloudinary(file.buffer)));
  res.json(
    uploads.map((item) => ({
      url: item.secure_url,
      publicId: item.public_id
    }))
  );
};

export const uploadProductImages = uploadImages;
export const uploadReviewImages = uploadImages;
