import axios from "axios";
import fetch from "node-fetch";

export const shareLinkedIn = async (files, accessToken, userId, postContent, mediaType) => {
    const mediaUrls = files?.map(file => `${process.env.DOMAIN}/uploads/${file.filename}`);
    console.log("MEDIA URLS: _______")
    console.log(mediaUrls);

    console.log("FILES: _______")
    console.log(files)
    try {
        let mediaUrns = [];

        // Step 1: Upload each media file if provided
        if (mediaType && mediaUrls?.length > 0) {
            for (const mediaUrl of mediaUrls) {
                const mediaUrn = await uploadMedia(accessToken, `urn:li:person:${userId}`, mediaType, mediaUrl);
                if (mediaUrn) {
                    mediaUrns.push({ status: "READY", media: mediaUrn });
                }
            }
            if (mediaUrns.length === 0) {
                console.error("Content Sharing Error: Failed to upload media files");

                throw new Error("Failed to upload media files");
            }
        }

        // Step 2: Create post with multiple media files
        const apiUrl = "https://api.linkedin.com/v2/ugcPosts";
        const postData = {
            author: `urn:li:person:${userId}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: postContent },
                    shareMediaCategory: mediaUrns.length > 0 ? "IMAGE" : "NONE",
                    media: mediaUrns,
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify(postData),
        });

        const responseData = await response.json();

        if (response.ok) {
            return responseData;
        } else {
            console.error("Content Sharing Error:", responseData);
            return { message: "Failed to share content", error: responseData };
        }
    } catch (error) {
        console.error("Content Sharing Error:", error);
        return { message: "Failed to share content", error: error.message };
    }
};

async function registerLinkedInUpload(accessToken, ownerUrn, type = "image") {
    const url = "https://api.linkedin.com/v2/assets?action=registerUpload";
    const recipes = {
        video: "urn:li:digitalmediaRecipe:feedshare-video",
        pdf: "urn:li:digitalmediaRecipe:feedshare-document",
        image: "urn:li:digitalmediaRecipe:feedshare-image",
    }[type] || "urn:li:digitalmediaRecipe:feedshare-image";

    const requestBody = {
        registerUploadRequest: {
            recipes: [recipes],
            owner: ownerUrn,
            serviceRelationships: [{
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
            }],
        },
    };

    try {
        const response = await axios.post(url, requestBody, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        return response.data.value;
    } catch (error) {
        console.error("Error registering upload:", error.response?.data || error.message);
        throw error;
    }
}

async function uploadMedia(accessToken, ownerUrn, type, mediaUrl) {
    try {
        const uploadData = await registerLinkedInUpload(accessToken, ownerUrn, type);
        const uploadUrl = uploadData.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
        const assetUrn = uploadData.asset;

        const mediaBuffer = Buffer.from(await fetch(mediaUrl).then(res => res.arrayBuffer()));

        const mediaResponse = await axios.put(uploadUrl, mediaBuffer, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": type === "video" ? "video/mp4" : type === "pdf" ? "application/pdf" : "image/jpeg",
            },
        });

        if (mediaResponse.status === 200 || mediaResponse.status === 201) {
            return assetUrn;
        } else {
            console.error("Media upload failed", mediaResponse.data);
            return null;
        }
    } catch (error) {
        console.error("Error uploading media:", error.response?.data || error.message);
        return null;
    }
}

