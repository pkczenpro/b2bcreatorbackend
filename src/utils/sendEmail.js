import axios from "axios";

/**
 * Sends an email using Brevo (Sendinblue) API.
 * @param {Object} options - Email sending options.
 * @param {Array} options.to - List of recipients [{ email, name }].
 * @param {string|number} options.templateId - Email template ID.
 * @param {Object} [options.params] - Dynamic template parameters.
 * @returns {Promise<{ success: boolean; message: string }>}
 */
export const sendEmail = async (options) => {
    try {
        const response = await axios.post(
            process.env.MAILER_URL,
            {
                to: options.to,
                templateId: options.templateId,
                params: options.params || {},
            },
            {
                headers: {
                    "Accept": "application/json",
                    "api-key": process.env.MAILER_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status === 200 || response.status === 201) {
            return { success: true, message: "Email sent successfully" };
        } else {
            return { success: false, message: "Failed to send email" };
        }
    } catch (error) {
        console.error("Error sending email:", error?.response?.data || error.message);
        return { success: false, message: "Error sending email. Please try again later." };
    }
};
