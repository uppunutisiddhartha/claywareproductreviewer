import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function ProductReview() {
    const { productId } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [reason, setReason] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    // ==========================================================
    // API
    // ==========================================================

    const API =
        import.meta.env.VITE_API_URL ||
        "http://127.0.0.1:8000/api";

    const REVIEW_API =
        `${API}/internal/product-reviews`;

    // ==========================================================
    // AUTH
    // ==========================================================

    const getToken = () => {
        return (
            localStorage.getItem("access_token") ||
            localStorage.getItem("sellerAccessToken")
        );
    };

    const getAuthConfig = () => {
        const token = getToken();

        if (!token) {
            throw new Error("Authentication required.");
        }

        return {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        };
    };

    // ==========================================================
    // API ERROR HANDLER
    // ==========================================================

    const handleApiError = (error, defaultMessage) => {
        console.error("================================");
        console.error("PRODUCT REVIEW API ERROR");
        console.error("STATUS:", error.response?.status);
        console.error("DATA:", error.response?.data);
        console.error("MESSAGE:", error.message);
        console.error("================================");

        if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");

            setError(
                "Your session has expired. Please login again."
            );

            return;
        }

        if (error.response?.status === 403) {
            setError(
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "You are not authorized to review this product."
            );

            return;
        }

        if (error.response?.status === 404) {
            setError(
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Product review was not found."
            );

            return;
        }

        if (error.response?.status === 400) {
            setError(
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Invalid request."
            );

            return;
        }

        setError(
            error.response?.data?.message ||
            error.response?.data?.detail ||
            error.message ||
            defaultMessage
        );
    };

    // ==========================================================
    // LOAD PRODUCT
    // ==========================================================

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            setError("");

            const token = getToken();

            console.log("================================");
            console.log("PRODUCT REVIEW PAGE");
            console.log("PRODUCT ID:", productId);
            console.log("TOKEN EXISTS:", !!token);
            console.log(
                "API:",
                `${REVIEW_API}/${productId}/`
            );
            console.log("================================");

            if (!token) {
                setError(
                    "Authentication required. Please login again."
                );

                setLoading(false);
                return;
            }

            if (!productId) {
                setError("Product ID is missing.");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(
                    `${REVIEW_API}/${productId}/`,
                    getAuthConfig()
                );

                console.log(
                    "================================"
                );
                console.log(
                    "FULL PRODUCT REVIEW RESPONSE:"
                );
                console.log(response.data);

                console.log(
                    "ASSIGNMENT STATUS:",
                    response.data?.assignment_status
                );

                console.log(
                    "VERIFICATION STATUS:",
                    response.data?.verification_status
                );

                console.log(
                    "PRODUCT STATUS:",
                    response.data?.product?.status
                );

                console.log(
                    "================================"
                );

                setProduct(response.data);

                const productData =
                    response.data?.product ||
                    response.data?.product_details ||
                    response.data ||
                    {};

                if (
                    Array.isArray(productData.images) &&
                    productData.images.length > 0
                ) {
                    setSelectedImage(
                        productData.images[0]
                    );
                }
            } catch (error) {
                handleApiError(
                    error,
                    "Unable to load product."
                );
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId]);

    // ==========================================================
    // START REVIEW
    // ==========================================================

    const startReview = async () => {
        if (actionLoading) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response = await axios.post(
                `${REVIEW_API}/${productId}/start/`,
                {},
                getAuthConfig()
            );

            console.log(
                "START REVIEW RESPONSE:",
                response.data
            );

            setProduct((previous) => ({
                ...previous,

                assignment_status:
                    response.data?.status ||
                    "in_review",

                verification_status:
                    response.data?.status ||
                    "in_review",

                status:
                    response.data?.status ||
                    "in_review",

                product: {
                    ...(previous?.product || {}),
                    status:
                        response.data?.status ||
                        "in_review",
                },
            }));

            setReason("");

        } catch (error) {
            handleApiError(
                error,
                "Unable to start review."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==========================================================
    // APPROVE
    // ==========================================================

    const approveProduct = async () => {
        if (actionLoading) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response = await axios.post(
                `${REVIEW_API}/${productId}/approve/`,
                {
                    reason: reason.trim(),
                },
                getAuthConfig()
            );

            console.log(
                "APPROVE RESPONSE:",
                response.data
            );

            alert(
                "Product approved successfully."
            );

            navigate("/dashboard");

        } catch (error) {
            handleApiError(
                error,
                "Unable to approve product."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==========================================================
    // REJECT
    // ==========================================================

    const rejectProduct = async () => {
        if (actionLoading) {
            return;
        }

        if (!reason.trim()) {
            setError(
                "Rejection reason is required."
            );
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response = await axios.post(
                `${REVIEW_API}/${productId}/reject/`,
                {
                    reason: reason.trim(),
                },
                getAuthConfig()
            );

            console.log(
                "REJECT RESPONSE:",
                response.data
            );

            alert("Product rejected.");

            navigate("/dashboard");

        } catch (error) {
            handleApiError(
                error,
                "Unable to reject product."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==========================================================
    // REQUEST CHANGES
    // ==========================================================

    const requestChanges = async () => {
        if (actionLoading) {
            return;
        }

        if (!reason.trim()) {
            setError(
                "Please enter the changes required."
            );
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response = await axios.post(
                `${REVIEW_API}/${productId}/request-changes/`,
                {
                    reason: reason.trim(),
                    issues: [],
                },
                getAuthConfig()
            );

            console.log(
                "REQUEST CHANGES RESPONSE:",
                response.data
            );

            alert(
                "Changes requested from seller."
            );

            navigate("/dashboard");

        } catch (error) {
            handleApiError(
                error,
                "Unable to request changes."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading) {
        return (
            <div style={styles.loadingPage}>
                <div style={styles.loadingContent}>
                    <div style={styles.spinner}>
                        ⟳
                    </div>

                    <h3>
                        Loading product...
                    </h3>

                    <p>
                        Please wait while we fetch
                        the product details.
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================================
    // ERROR WITHOUT PRODUCT
    // ==========================================================

    if (error && !product) {
        return (
            <div style={styles.page}>
                <div style={styles.errorBox}>

                    <div style={styles.errorIcon}>
                        !
                    </div>

                    <h2>
                        Unable to load product
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                        style={styles.backButton}
                    >
                        Back to Dashboard
                    </button>

                </div>
            </div>
        );
    }

    // ==========================================================
    // NORMALIZE PRODUCT
    // ==========================================================

    const productData =
        product?.product ||
        product?.product_details ||
        product ||
        {};

    // ==========================================================
    // IMPORTANT STATUS LOGIC
    // ==========================================================

    /*
        IMPORTANT:

        Review buttons depend on ASSIGNMENT STATUS.

        Django:
            assigned
            in_review
            completed

        Product status is different:
            pending_verification
            in_review
            approved
            rejected
            changes_required
    */

    const assignmentStatus = String(
        product?.assignment_status ||
        product?.assignment?.status ||
        ""
    ).toLowerCase();

    const verificationStatus = String(
        product?.verification_status ||
        product?.verification_request?.status ||
        ""
    ).toLowerCase();

    const productStatus = String(
        productData.status ||
        ""
    ).toLowerCase();

    let status = assignmentStatus;

    if (!status) {
        if (verificationStatus === "in_review") {
            status = "in_review";
        } else if (verificationStatus === "assigned") {
            status = "assigned";
        } else if (productStatus === "in_review") {
            status = "in_review";
        } else {
            status = "assigned";
        }
    }

    console.log(
        "CURRENT REVIEW STATUS:",
        status
    );

    // ==========================================================
    // PRODUCT VALUES
    // ==========================================================

    const productName =
        productData.productname ||
        productData.name ||
        product?.product_name ||
        `Product #${productId}`;

    const images =
        Array.isArray(productData.images)
            ? productData.images
            : [];

    const variants =
        Array.isArray(productData.variants)
            ? productData.variants
            : [];

    // ==========================================================
    // IMAGE URL
    // ==========================================================

    const getImageUrl = (image) => {
        if (!image) {
            return null;
        }

        const imageValue =
            typeof image === "string"
                ? image
                : image.image;

        if (!imageValue) {
            return null;
        }

        if (
            imageValue.startsWith("http://") ||
            imageValue.startsWith("https://")
        ) {
            return imageValue;
        }

        <img
    src={getImageUrl(currentImage)}
    alt={productName}
    style={styles.mainImage}
    onLoad={() => {
        console.log(
            "IMAGE LOADED:",
            getImageUrl(currentImage)
        );
    }}
    onError={(event) => {
        console.error(
            "IMAGE FAILED:",
            getImageUrl(currentImage)
        );
        console.error(
            "ORIGINAL IMAGE:",
            currentImage
        );

        event.currentTarget.style.display = "none";
    }}
/>
        const mediaBase =
            import.meta.env.VITE_MEDIA_URL;

        if (mediaBase) {
            return `${mediaBase.replace(/\/$/, "")}/${imageValue}`;
        }

        return `/${imageValue}`;
    };

    // ==========================================================
    // CURRENT IMAGE
    // ==========================================================

    const currentImage =
        selectedImage ||
        images[0] ||
        null;

    // ==========================================================
    // PAGE
    // ==========================================================

    return (
        <div style={styles.page}>

            <div style={styles.container}>

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div style={styles.header}>

                    <div>

                        <div style={styles.brand}>
                            ClayWare
                        </div>

                        <h1 style={styles.title}>
                            Product Verification
                        </h1>

                        <p style={styles.subtitle}>
                            Carefully review all product
                            information before making a decision.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                        style={styles.backButton}
                    >
                        ← Back to Dashboard
                    </button>

                </div>

                {/* ==================================================
                    ERROR / WARNING
                ================================================== */}

                {error && (
                    <div style={styles.warning}>
                        {error}
                    </div>
                )}

                {/* ==================================================
                    PRODUCT HEADER
                ================================================== */}

                <div style={styles.card}>

                    <div style={styles.productHeader}>

                        <div>

                            <h2
                                style={styles.productName}
                            >
                                {productName}
                            </h2>

                            <p style={styles.productId}>
                                Product ID:{" "}
                                <strong>
                                    {productData.id ||
                                        productId}
                                </strong>
                            </p>

                        </div>

                        <span
                            style={getStatusStyle(status)}
                        >
                            {formatStatus(status)}
                        </span>

                    </div>

                    {/* STATUS DEBUG / INFORMATION */}

                    <div style={styles.statusGrid}>

                        <StatusItem
                            label="Assignment"
                            value={
                                assignmentStatus ||
                                "-"
                            }
                        />

                        <StatusItem
                            label="Verification"
                            value={
                                verificationStatus ||
                                "-"
                            }
                        />

                        <StatusItem
                            label="Product"
                            value={
                                productStatus ||
                                "-"
                            }
                        />

                    </div>

                </div>

                {/* ==================================================
                    PRODUCT IMAGES
                ================================================== */}

                <div style={styles.card}>

                    <h3 style={styles.cardTitle}>
                        Product Images
                    </h3>

                    {images.length === 0 ? (

                        <div style={styles.noImages}>
                            No product images available.
                        </div>

                    ) : (

                        <div style={styles.imageSection}>

                            <div
                                style={
                                    styles.mainImageWrapper
                                }
                            >

                                {currentImage ? (

                                    <img
                                        src={getImageUrl(
                                            currentImage
                                        )}
                                        alt={productName}
                                        style={styles.mainImage}
                                        onError={(event) => {
                                            event.currentTarget.style.display =
                                                "none";
                                        }}
                                    />

                                ) : (

                                    <div
                                        style={
                                            styles.imagePlaceholder
                                        }
                                    >
                                        No Image
                                    </div>

                                )}

                            </div>

                            <div
                                style={
                                    styles.thumbnailList
                                }
                            >

                                {images.map(
                                    (
                                        image,
                                        index
                                    ) => (

                                        <button
                                            type="button"
                                            key={
                                                image.id ||
                                                index
                                            }
                                            onClick={() =>
                                                setSelectedImage(
                                                    image
                                                )
                                            }
                                            style={
                                                selectedImage ===
                                                image
                                                    ? styles.selectedThumbnail
                                                    : styles.thumbnail
                                            }
                                        >

                                            <img
                                                src={
                                                    getImageUrl(
                                                        image
                                                    )
                                                }
                                                alt={`Product ${index + 1}`}
                                                style={
                                                    styles.thumbnailImage
                                                }
                                            />

                                        </button>

                                    )
                                )}

                            </div>

                        </div>

                    )}

                </div>

                {/* ==================================================
                    SELLER INFORMATION
                ================================================== */}

                <div style={styles.card}>

                    <h3 style={styles.cardTitle}>
                        Seller Information
                    </h3>

                    <div style={styles.infoGrid}>

                        <InfoItem
                            label="Seller ID"
                            value={
                                productData.seller_id ||
                                "-"
                            }
                        />

                        <InfoItem
                            label="Seller Name"
                            value={
                                productData.seller_name ||
                                "-"
                            }
                        />

                        <InfoItem
                            label="Shop Name"
                            value={
                                productData.shop_name ||
                                "-"
                            }
                        />

                    </div>

                </div>

                {/* ==================================================
                    PRODUCT DETAILS
                ================================================== */}

                <div style={styles.card}>

                    <h3 style={styles.cardTitle}>
                        Product Details
                    </h3>

                    <div style={styles.infoGrid}>

                        <InfoItem
                            label="Category"
                            value={
                                productData.category ||
                                "-"
                            }
                        />

                        <InfoItem
                            label="Capacity"
                            value={
                                productData.capacity ||
                                "-"
                            }
                        />

                        <InfoItem
                            label="Weight"
                            value={
                                productData.weight ||
                                "-"
                            }
                        />

                        <InfoItem
                            label="Stock Quantity"
                            value={
                                productData.stock_quantity ??
                                "-"
                            }
                        />

                        <InfoItem
                            label="Price"
                            value={
                                productData.price != null
                                    ? `₹${productData.price}`
                                    : "-"
                            }
                        />

                        <InfoItem
                            label="Discount Price"
                            value={
                                productData.discount_price !=
                                null
                                    ? `₹${productData.discount_price}`
                                    : "-"
                            }
                        />

                        <InfoItem
                            label="Product Status"
                            value={formatStatus(
                                productStatus ||
                                "unknown"
                            )}
                        />

                    </div>

                    <div
                        style={
                            styles.descriptionBox
                        }
                    >

                        <span
                            style={
                                styles.descriptionLabel
                            }
                        >
                            Description
                        </span>

                        <p
                            style={
                                styles.description
                            }
                        >
                            {productData.description ||
                                "No description provided."}
                        </p>

                    </div>

                </div>

                {/* ==================================================
                    PRODUCT VARIANTS
                ================================================== */}

                <div style={styles.card}>

                    <div style={styles.sectionHeader}>

                        <div>

                            <h3
                                style={
                                    styles.cardTitle
                                }
                            >
                                Product Variants
                            </h3>

                            <p
                                style={
                                    styles.sectionSubtitle
                                }
                            >
                                {variants.length} variant
                                {variants.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                available
                            </p>

                        </div>

                    </div>

                    {variants.length === 0 ? (

                        <div style={styles.noVariants}>
                            No variants available.
                        </div>

                    ) : (

                        <div
                            style={
                                styles.variantTableWrapper
                            }
                        >

                            <table
                                style={
                                    styles.variantTable
                                }
                            >

                                <thead>

                                    <tr>

                                        <th style={styles.th}>
                                            ID
                                        </th>

                                        <th style={styles.th}>
                                            Capacity
                                        </th>

                                        <th style={styles.th}>
                                            Price
                                        </th>

                                        <th style={styles.th}>
                                            Discount Price
                                        </th>

                                        <th style={styles.th}>
                                            Stock
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {variants.map(
                                        (variant) => (

                                            <tr
                                                key={
                                                    variant.id
                                                }
                                            >

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {variant.id}
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {variant.capacity ||
                                                        "-"}
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {variant.price !=
                                                    null
                                                        ? `₹${variant.price}`
                                                        : "-"}
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {variant.discount_price !=
                                                    null
                                                        ? `₹${variant.discount_price}`
                                                        : "-"}
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {variant.stock_quantity ??
                                                        "-"}
                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

                {/* ==================================================
                    PRODUCT TIMELINE
                ================================================== */}

                <div style={styles.card}>

                    <h3 style={styles.cardTitle}>
                        Product Timeline
                    </h3>

                    <div style={styles.infoGrid}>

                        <InfoItem
                            label="Created"
                            value={formatDate(
                                productData.created_at
                            )}
                        />

                        <InfoItem
                            label="Last Updated"
                            value={formatDate(
                                productData.updated_at
                            )}
                        />

                    </div>

                </div>

                {/* ==================================================
                    REVIEW COMMENTS
                ================================================== */}

                <div style={styles.card}>

                    <h3 style={styles.cardTitle}>
                        Review Comments
                    </h3>

                    <textarea
                        value={reason}
                        onChange={(event) => {
                            setReason(
                                event.target.value
                            );
                            setError("");
                        }}
                        placeholder={
                            status === "in_review"
                                ? "Enter review comments, rejection reason, or changes required..."
                                : "Click Start Review first to enter review comments..."
                        }
                        style={{
                            ...styles.textarea,
                            ...(status !== "in_review"
                                ? styles.textareaDisabled
                                : {}),
                        }}
                        disabled={
                            actionLoading ||
                            status !== "in_review"
                        }
                    />

                    <p style={styles.helper}>

                        {status === "in_review"
                            ? "You can enter review comments. A reason is required for rejection or requesting changes."
                            : "Start the review first. The comment box will become active."}

                    </p>

                </div>

                {/* ==================================================
                    ACTION BUTTONS
                ================================================== */}

                <div style={styles.actionsCard}>

                    {/* ================================
                        ASSIGNED
                    ================================= */}

                    {status === "assigned" && (
                        <>

                            <div
                                style={
                                    styles.actionInfo
                                }
                            >

                                <strong>
                                    Product assigned to you
                                </strong>

                                <span>
                                    Start the review to
                                    enable approval,
                                    rejection and
                                    change requests.
                                </span>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    startReview
                                }
                                disabled={
                                    actionLoading
                                }
                                style={
                                    actionLoading
                                        ? {
                                            ...styles.startButton,
                                            ...styles.disabledButton,
                                        }
                                        : styles.startButton
                                }
                            >

                                {actionLoading
                                    ? "Starting..."
                                    : "▶ Start Review"}

                            </button>

                        </>
                    )}

                    {/* ================================
                        IN REVIEW
                    ================================= */}

                    {status === "in_review" && (
                        <>

                            <div
                                style={
                                    styles.actionInfo
                                }
                            >

                                <strong>
                                    Review in progress
                                </strong>

                                <span>
                                    Check all product
                                    information before
                                    making your decision.
                                </span>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    approveProduct
                                }
                                disabled={
                                    actionLoading
                                }
                                style={
                                    actionLoading
                                        ? {
                                            ...styles.approveButton,
                                            ...styles.disabledButton,
                                        }
                                        : styles.approveButton
                                }
                            >

                                {actionLoading
                                    ? "Processing..."
                                    : "✓ Approve Product"}

                            </button>

                            <button
                                type="button"
                                onClick={
                                    rejectProduct
                                }
                                disabled={
                                    actionLoading
                                }
                                style={
                                    actionLoading
                                        ? {
                                            ...styles.rejectButton,
                                            ...styles.disabledButton,
                                        }
                                        : styles.rejectButton
                                }
                            >

                                {actionLoading
                                    ? "Processing..."
                                    : "✕ Reject Product"}

                            </button>

                            <button
                                type="button"
                                onClick={
                                    requestChanges
                                }
                                disabled={
                                    actionLoading
                                }
                                style={
                                    actionLoading
                                        ? {
                                            ...styles.changeButton,
                                            ...styles.disabledButton,
                                        }
                                        : styles.changeButton
                                }
                            >

                                {actionLoading
                                    ? "Processing..."
                                    : "⚠ Request Changes"}

                            </button>

                        </>
                    )}

                    {/* ================================
                        COMPLETED
                    ================================= */}

                    {(
                        status === "completed" ||
                        status === "approved" ||
                        status === "rejected" ||
                        status === "changes_requested" ||
                        status === "changes_required"
                    ) && (

                        <div
                            style={
                                styles.completedBox
                            }
                        >

                            <strong>
                                Review Completed
                            </strong>

                            <span>
                                This product review
                                has already been
                                completed.
                            </span>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}


// ==========================================================
// INFO ITEM
// ==========================================================

function InfoItem({
    label,
    value,
}) {
    return (
        <div style={styles.infoItem}>

            <span style={styles.infoLabel}>
                {label}
            </span>

            <strong style={styles.infoValue}>
                {value}
            </strong>

        </div>
    );
}


// ==========================================================
// STATUS ITEM
// ==========================================================

function StatusItem({
    label,
    value,
}) {
    return (
        <div style={styles.statusItem}>

            <span style={styles.statusItemLabel}>
                {label}
            </span>

            <strong style={styles.statusItemValue}>
                {formatStatus(value)}
            </strong>

        </div>
    );
}


// ==========================================================
// FORMAT STATUS
// ==========================================================

function formatStatus(status) {
    return String(status || "")
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (char) => char.toUpperCase()
        );
}


// ==========================================================
// STATUS STYLE
// ==========================================================

function getStatusStyle(status) {

    const base = {
        display: "inline-block",
        padding: "8px 15px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "700",
        whiteSpace: "nowrap",
    };

    if (status === "assigned") {
        return {
            ...base,
            background: "#fff3cd",
            color: "#856404",
        };
    }

    if (status === "in_review") {
        return {
            ...base,
            background: "#dbeafe",
            color: "#1d4ed8",
        };
    }

    if (status === "approved") {
        return {
            ...base,
            background: "#dcfce7",
            color: "#166534",
        };
    }

    if (status === "rejected") {
        return {
            ...base,
            background: "#fee2e2",
            color: "#991b1b",
        };
    }

    if (
        status === "changes_required" ||
        status === "changes_requested"
    ) {
        return {
            ...base,
            background: "#ffedd5",
            color: "#9a3412",
        };
    }

    if (status === "completed") {
        return {
            ...base,
            background: "#e5e7eb",
            color: "#374151",
        };
    }

    return {
        ...base,
        background: "#e5e7eb",
        color: "#374151",
    };
}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }

    try {
        return new Date(value).toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short",
            }
        );
    } catch {
        return value;
    }
}


// ==========================================================
// STYLES
// ==========================================================

const styles = {

    page: {
        minHeight: "100vh",
        padding: "35px",
        background: "#f4f6f8",
        boxSizing: "border-box",
    },

    container: {
        maxWidth: "1100px",
        margin: "0 auto",
    },

    loadingPage: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f6f8",
    },

    loadingContent: {
        textAlign: "center",
        color: "#555",
    },

    spinner: {
        fontSize: "42px",
        marginBottom: "10px",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "25px",
        marginBottom: "25px",
        background: "#fff",
        padding: "25px",
        borderRadius: "14px",
        boxShadow:
            "0 4px 16px rgba(0,0,0,0.05)",
    },

    brand: {
        color: "#1f6f54",
        fontSize: "14px",
        fontWeight: "800",
        marginBottom: "5px",
    },

    title: {
        margin: 0,
        fontSize: "28px",
        color: "#1f2937",
    },

    subtitle: {
        marginTop: "7px",
        marginBottom: 0,
        color: "#6b7280",
        fontSize: "14px",
    },

    card: {
        background: "#fff",
        padding: "25px",
        borderRadius: "14px",
        marginBottom: "20px",
        boxShadow:
            "0 4px 16px rgba(0,0,0,0.05)",
    },

    productHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
    },

    productName: {
        margin: 0,
        fontSize: "25px",
        color: "#111827",
    },

    productId: {
        marginTop: "8px",
        marginBottom: 0,
        color: "#6b7280",
        fontSize: "13px",
    },

    statusGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "10px",
        marginTop: "20px",
    },

    statusItem: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "10px 12px",
        background: "#f9fafb",
        borderRadius: "8px",
    },

    statusItemLabel: {
        fontSize: "10px",
        textTransform: "uppercase",
        color: "#9ca3af",
        fontWeight: "700",
    },

    statusItemValue: {
        fontSize: "13px",
        color: "#374151",
    },

    cardTitle: {
        marginTop: 0,
        marginBottom: "20px",
        fontSize: "19px",
        color: "#1f2937",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },

    sectionSubtitle: {
        marginTop: "-10px",
        color: "#6b7280",
        fontSize: "13px",
    },

    imageSection: {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
    },

    mainImageWrapper: {
        width: "100%",
        height: "420px",
        borderRadius: "12px",
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },

    mainImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
    },

    thumbnailList: {
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
    },

    thumbnail: {
        width: "80px",
        height: "80px",
        padding: "3px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fff",
        cursor: "pointer",
        overflow: "hidden",
    },

    selectedThumbnail: {
        width: "80px",
        height: "80px",
        padding: "3px",
        border: "3px solid #1f6f54",
        borderRadius: "8px",
        background: "#fff",
        cursor: "pointer",
        overflow: "hidden",
    },

    thumbnailImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "5px",
    },

    imagePlaceholder: {
        color: "#9ca3af",
        fontSize: "16px",
    },

    noImages: {
        padding: "40px",
        textAlign: "center",
        background: "#f9fafb",
        borderRadius: "8px",
        color: "#6b7280",
    },

    infoGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "20px",
    },

    infoItem: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "13px",
        background: "#f9fafb",
        borderRadius: "8px",
    },

    infoLabel: {
        fontSize: "11px",
        textTransform: "uppercase",
        color: "#9ca3af",
        fontWeight: "700",
    },

    infoValue: {
        fontSize: "14px",
        color: "#374151",
        wordBreak: "break-word",
    },

    descriptionBox: {
        marginTop: "20px",
        padding: "16px",
        background: "#f9fafb",
        borderRadius: "9px",
    },

    descriptionLabel: {
        fontSize: "11px",
        textTransform: "uppercase",
        color: "#9ca3af",
        fontWeight: "700",
    },

    description: {
        marginTop: "8px",
        marginBottom: 0,
        color: "#4b5563",
        lineHeight: "1.6",
        fontSize: "14px",
    },

    variantTableWrapper: {
        overflowX: "auto",
    },

    variantTable: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: "650px",
    },

    th: {
        textAlign: "left",
        padding: "13px",
        background: "#f8fafc",
        borderBottom:
            "2px solid #e5e7eb",
        color: "#6b7280",
        fontSize: "12px",
        textTransform: "uppercase",
    },

    td: {
        padding: "14px 13px",
        borderBottom:
            "1px solid #e5e7eb",
        color: "#374151",
        fontSize: "14px",
    },

    noVariants: {
        padding: "30px",
        textAlign: "center",
        background: "#f9fafb",
        borderRadius: "8px",
        color: "#6b7280",
    },

    textarea: {
        width: "100%",
        minHeight: "140px",
        padding: "14px",
        boxSizing: "border-box",
        border:
            "1px solid #d1d5db",
        borderRadius: "9px",
        fontSize: "14px",
        resize: "vertical",
        outline: "none",
        fontFamily: "inherit",
    },

    textareaDisabled: {
        background: "#f3f4f6",
        color: "#9ca3af",
        cursor: "not-allowed",
    },

    helper: {
        marginBottom: 0,
        color: "#6b7280",
        fontSize: "13px",
    },

    actionsCard: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        padding: "20px",
        background: "#fff",
        borderRadius: "14px",
        boxShadow:
            "0 4px 16px rgba(0,0,0,0.05)",
        marginBottom: "30px",
    },

    actionInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "12px 15px",
        background: "#f8fafc",
        borderRadius: "8px",
        color: "#374151",
        fontSize: "14px",
        minWidth: "260px",
    },

    startButton: {
        padding: "13px 22px",
        border: "none",
        borderRadius: "8px",
        background: "#1f6f54",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
    },

    approveButton: {
        padding: "13px 22px",
        border: "none",
        borderRadius: "8px",
        background: "#2e7d32",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
    },

    rejectButton: {
        padding: "13px 22px",
        border: "none",
        borderRadius: "8px",
        background: "#d32f2f",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
    },

    changeButton: {
        padding: "13px 22px",
        border: "none",
        borderRadius: "8px",
        background: "#ed6c02",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
    },

    backButton: {
        padding: "10px 18px",
        border: "none",
        borderRadius: "8px",
        background: "#374151",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "600",
        whiteSpace: "nowrap",
    },

    warning: {
        background: "#fff3cd",
        color: "#856404",
        padding: "13px 16px",
        borderRadius: "8px",
        marginBottom: "20px",
    },

    errorBox: {
        maxWidth: "520px",
        margin: "100px auto",
        padding: "45px",
        background: "#fff",
        borderRadius: "14px",
        textAlign: "center",
        boxShadow:
            "0 5px 20px rgba(0,0,0,0.06)",
        color: "#d32f2f",
    },

    errorIcon: {
        width: "45px",
        height: "45px",
        borderRadius: "50%",
        margin: "0 auto 15px",
        background: "#fee2e2",
        color: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        fontWeight: "800",
    },

    completedBox: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "15px 20px",
        borderRadius: "8px",
        background: "#e8f5e9",
        color: "#2e7d32",
    },

    disabledButton: {
        opacity: 0.6,
        cursor: "not-allowed",
    },
};

export default ProductReview;