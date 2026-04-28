import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

export const uploadBufferToCloudinary = (buffer, folder = "ornac/products") =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
