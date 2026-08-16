import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [reviews, setReviews] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [selectedStatus, setSelectedStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    const API =
        import.meta.env.VITE_API_URL ||
        "http://127.0.0.1:8000/api";

    // ==========================================================
    // AUTH HEADERS
    // ==========================================================

    const getHeaders = () => {
        const token = localStorage.getItem("access_token");

        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    };

    // ==========================================================
    // LOAD DASHBOARD
    // ==========================================================

    const loadDashboard = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        const token = localStorage.getItem("access_token");

        if (!token) {
            setError("Authentication required. Please login again.");
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            // --------------------------------------------------
            // CURRENT USER
            // --------------------------------------------------

            const userResponse = await axios.get(
                `${API}/accounts/me/`,
                {
                    headers: getHeaders(),
                }
            );

            const currentUser = userResponse.data;

            if (currentUser.role !== "product_reviewer") {
                setError(
                    "Access denied. You are not a Product Reviewer."
                );
                return;
            }

            if (currentUser.account_status !== "active") {
                setError(
                    "Your Product Reviewer account is not active."
                );
                return;
            }

            setUser(currentUser);

            // --------------------------------------------------
            // REVIEW QUEUE
            // --------------------------------------------------

            const queueResponse = await axios.get(
                `${API}/internal/product-reviews/my-queue/`,
                {
                    headers: getHeaders(),
                }
            );

            const queueData = queueResponse.data;

            let results = [];

            if (
                queueData &&
                Array.isArray(queueData.results)
            ) {
                results = queueData.results;
            } else if (Array.isArray(queueData)) {
                results = queueData;
            }

            setReviews(results);
        } catch (err) {
            console.error("DASHBOARD ERROR:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");

                setError(
                    "Your session has expired. Please login again."
                );

                return;
            }

            if (err.response?.status === 403) {
                setError(
                    err.response?.data?.message ||
                        err.response?.data?.detail ||
                        "You are not authorized to access the review dashboard."
                );

                return;
            }

            setError(
                err.response?.data?.message ||
                    err.response?.data?.detail ||
                    "Unable to load review dashboard."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [API]);

    // ==========================================================
    // LOGOUT
    // ==========================================================

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        navigate("/");
    };

    // ==========================================================
    // PRODUCT HELPERS
    // ==========================================================

    const getProduct = (review) => {
        if (review?.product) {
            return review.product;
        }

        if (review?.verification_request?.product) {
            return review.verification_request.product;
        }

        return {};
    };

    const getProductId = (review) => {
        const product = getProduct(review);

        if (product?.id) {
            return product.id;
        }

        if (review?.verification_request?.product_id) {
            return review.verification_request.product_id;
        }

        if (review?.product_id) {
            return review.product_id;
        }

        return null;
    };

    const getProductName = (review) => {
        const product = getProduct(review);

        return (
            product.productname ||
            product.name ||
            review.product_name ||
            `Product #${getProductId(review) || ""}`
        );
    };

    // ==========================================================
    // PRODUCT IMAGE
    // ==========================================================

    const getProductImage = (review) => {
        const product = getProduct(review);

        let image =
            product.image ||
            product.image_url ||
            product.thumbnail ||
            product.product_image;

        // Possible image arrays
        if (!image && Array.isArray(product.images)) {
            const firstImage = product.images[0];

            if (typeof firstImage === "string") {
                image = firstImage;
            } else if (firstImage) {
                image =
                    firstImage.image ||
                    firstImage.image_url ||
                    firstImage.url;
            }
        }

        if (!image && Array.isArray(review.images)) {
            const firstImage = review.images[0];

            if (typeof firstImage === "string") {
                image = firstImage;
            } else if (firstImage) {
                image =
                    firstImage.image ||
                    firstImage.image_url ||
                    firstImage.url;
            }
        }

        if (!image) {
            return null;
        }

        // Absolute URL
        if (
            image.startsWith("http://") ||
            image.startsWith("https://")
        ) {
            return image;
        }

        // Django media URL
        const baseURL = API.replace("/api", "");

        if (image.startsWith("/")) {
            return `${baseURL}${image}`;
        }

        return `${baseURL}/media/${image}`;
    };

    // ==========================================================
    // STATUS
    // ==========================================================

    const getDisplayStatus = (review) => {
        const assignmentStatus =
            review?.assignment_status ||
            review?.status;

        const decision =
            review?.review_decision ||
            review?.decision;

        const productStatus =
            getProduct(review)?.status;

        if (
            decision === "approved" ||
            productStatus === "approved"
        ) {
            return "approved";
        }

        if (
            decision === "rejected" ||
            productStatus === "rejected"
        ) {
            return "rejected";
        }

        if (
            decision === "changes_required" ||
            decision === "changes_requested" ||
            productStatus === "changes_required" ||
            productStatus === "changes_requested"
        ) {
            return "changes_required";
        }

        if (assignmentStatus === "in_review") {
            return "in_review";
        }

        if (assignmentStatus === "assigned") {
            return "assigned";
        }

        if (assignmentStatus === "completed") {
            return "completed";
        }

        return (
            assignmentStatus ||
            productStatus ||
            "unknown"
        );
    };

    const getStatusLabel = (status) => {
        const labels = {
            assigned: "Ready for Review",
            in_review: "In Review",
            approved: "Approved",
            rejected: "Rejected",
            changes_required: "Changes Required",
            completed: "Completed",
            unknown: "Unknown",
        };

        return labels[status] || status;
    };

    // ==========================================================
    // STATISTICS
    // ==========================================================

    const statistics = useMemo(() => {
        const stats = {
            total: reviews.length,
            assigned: 0,
            inReview: 0,
            approved: 0,
            rejected: 0,
            changesRequired: 0,
        };

        reviews.forEach((review) => {
            const status = getDisplayStatus(review);

            if (status === "assigned") {
                stats.assigned++;
            }

            if (status === "in_review") {
                stats.inReview++;
            }

            if (status === "approved") {
                stats.approved++;
            }

            if (status === "rejected") {
                stats.rejected++;
            }

            if (status === "changes_required") {
                stats.changesRequired++;
            }
        });

        return stats;
    }, [reviews]);

    // ==========================================================
    // FILTER + SEARCH + SORT
    // ==========================================================

    const filteredReviews = useMemo(() => {
        let data = [...reviews];

        if (selectedStatus !== "all") {
            data = data.filter(
                (review) =>
                    getDisplayStatus(review) ===
                    selectedStatus
            );
        }

        if (search.trim()) {
            const query = search.toLowerCase();

            data = data.filter((review) => {
                const product = getProduct(review);

                const name =
                    getProductName(review).toLowerCase();

                const seller = String(
                    product.seller_name ||
                        product.seller?.name ||
                        ""
                ).toLowerCase();

                const category = String(
                    product.category || ""
                ).toLowerCase();

                const id = String(
                    getProductId(review) || ""
                ).toLowerCase();

                return (
                    name.includes(query) ||
                    seller.includes(query) ||
                    category.includes(query) ||
                    id.includes(query)
                );
            });
        }

        data.sort((a, b) => {
            if (sortBy === "name") {
                return getProductName(a).localeCompare(
                    getProductName(b)
                );
            }

            if (sortBy === "oldest") {
                return (
                    new Date(
                        a.created_at || 0
                    ) -
                    new Date(
                        b.created_at || 0
                    )
                );
            }

            return (
                new Date(
                    b.created_at || 0
                ) -
                new Date(
                    a.created_at || 0
                )
            );
        });

        return data;
    }, [
        reviews,
        selectedStatus,
        search,
        sortBy,
    ]);

    // ==========================================================
    // OPEN REVIEW
    // ==========================================================

    const openProductReview = (review) => {
        const productId = getProductId(review);

        if (!productId) {
            alert(
                "Product ID was not received from the server."
            );

            console.error(
                "PRODUCT ID MISSING:",
                review
            );

            return;
        }

        navigate(`/review/${productId}`, {
            state: {
                status: getDisplayStatus(review),
                review,
            },
        });
    };

    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading) {
        return (
            <div style={styles.loadingPage}>
                <div style={styles.loaderCard}>
                    <div style={styles.logoCircle}>
                        CW
                    </div>

                    <div style={styles.loader}></div>

                    <h3>Loading ClayWare</h3>

                    <p>
                        Preparing your review workspace...
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================================
    // ERROR
    // ==========================================================

    if (error) {
        return (
            <div style={styles.errorPage}>
                <div style={styles.errorCard}>
                    <div style={styles.errorIcon}>
                        !
                    </div>

                    <h2>
                        Unable to load dashboard
                    </h2>

                    <p>{error}</p>

                    <button
                        onClick={() => navigate("/")}
                        style={styles.primaryButton}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================================
    // DASHBOARD
    // ==========================================================

    return (
        <div style={styles.app}>

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside style={styles.sidebar}>

                <div style={styles.sidebarLogo}>
                    <div style={styles.logoMark}>
                        CW
                    </div>

                    <div>
                        <div style={styles.logoText}>
                            ClayWare
                        </div>

                        <div style={styles.logoSub}>
                            Review Center
                        </div>
                    </div>
                </div>

                <div style={styles.sidebarSection}>
                    <div style={styles.sidebarLabel}>
                        WORKSPACE
                    </div>

                    <button
                        style={{
                            ...styles.navItem,
                            ...styles.navItemActive,
                        }}
                    >
                        <span>▦</span>
                        Dashboard
                    </button>

                    <button
                        onClick={() =>
                            selectStatusAndScroll(
                                "assigned"
                            )
                        }
                        style={styles.navItem}
                    >
                        <span>◷</span>
                        Ready for Review
                        {statistics.assigned > 0 && (
                            <span style={styles.navBadge}>
                                {statistics.assigned}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() =>
                            selectStatusAndScroll(
                                "in_review"
                            )
                        }
                        style={styles.navItem}
                    >
                        <span>◉</span>
                        In Review
                    </button>

                    <button
                        onClick={() =>
                            selectStatusAndScroll(
                                "approved"
                            )
                        }
                        style={styles.navItem}
                    >
                        <span>✓</span>
                        Approved
                    </button>

                    <button
                        onClick={() =>
                            selectStatusAndScroll(
                                "rejected"
                            )
                        }
                        style={styles.navItem}
                    >
                        <span>×</span>
                        Rejected
                    </button>
                </div>

                <div style={styles.sidebarBottom}>

                    <div style={styles.reviewerBox}>
                        <div style={styles.avatar}>
                            {getInitials(
                                user?.name ||
                                    user?.email
                            )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <div style={styles.reviewerName}>
                                {user?.name ||
                                    user?.email ||
                                    "Reviewer"}
                            </div>

                            <div style={styles.reviewerRole}>
                                Product Reviewer
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        style={styles.sidebarLogout}
                    >
                        ↪ Logout
                    </button>

                </div>
            </aside>

            {/* ==================================================
                MAIN
            ================================================== */}

            <main style={styles.main}>

                {/* HEADER */}

                <header style={styles.topHeader}>

                    <div>
                        <div style={styles.breadcrumb}>
                            Workspace / Dashboard
                        </div>

                        <h1 style={styles.pageTitle}>
                            Product Review Dashboard
                        </h1>

                        <p style={styles.pageSubtitle}>
                            Review and verify products assigned
                            to your team.
                        </p>
                    </div>

                    <div style={styles.headerActions}>

                        <button
                            onClick={() =>
                                loadDashboard(true)
                            }
                            disabled={refreshing}
                            style={styles.refreshButton}
                        >
                            <span
                                style={{
                                    display: "inline-block",
                                    animation: refreshing
                                        ? "spin 1s linear infinite"
                                        : "none",
                                }}
                            >
                                ↻
                            </span>

                            {refreshing
                                ? "Refreshing..."
                                : "Refresh"}
                        </button>

                        <div style={styles.headerProfile}>
                            <div style={styles.headerAvatar}>
                                {getInitials(
                                    user?.name ||
                                        user?.email
                                )}
                            </div>

                            <div>
                                <strong>
                                    {user?.name ||
                                        user?.email ||
                                        "Reviewer"}
                                </strong>

                                <span>
                                    Product Reviewer
                                </span>
                            </div>
                        </div>
                    </div>

                </header>

                {/* ==================================================
                    STATS
                ================================================== */}

                <section style={styles.statsGrid}>

                    <StatCard
                        title="Total Assigned"
                        number={statistics.total}
                        icon="▦"
                        active={
                            selectedStatus ===
                            "all"
                        }
                        color="green"
                        onClick={() =>
                            selectStatusAndScroll(
                                "all"
                            )
                        }
                    />

                    <StatCard
                        title="Ready for Review"
                        number={statistics.assigned}
                        icon="◷"
                        active={
                            selectedStatus ===
                            "assigned"
                        }
                        color="yellow"
                        onClick={() =>
                            selectStatusAndScroll(
                                "assigned"
                            )
                        }
                    />

                    <StatCard
                        title="In Review"
                        number={statistics.inReview}
                        icon="◉"
                        active={
                            selectedStatus ===
                            "in_review"
                        }
                        color="blue"
                        onClick={() =>
                            selectStatusAndScroll(
                                "in_review"
                            )
                        }
                    />

                    <StatCard
                        title="Approved"
                        number={statistics.approved}
                        icon="✓"
                        active={
                            selectedStatus ===
                            "approved"
                        }
                        color="green"
                        onClick={() =>
                            selectStatusAndScroll(
                                "approved"
                            )
                        }
                    />

                    <StatCard
                        title="Rejected"
                        number={statistics.rejected}
                        icon="×"
                        active={
                            selectedStatus ===
                            "rejected"
                        }
                        color="red"
                        onClick={() =>
                            selectStatusAndScroll(
                                "rejected"
                            )
                        }
                    />

                    <StatCard
                        title="Changes Required"
                        number={
                            statistics.changesRequired
                        }
                        icon="!"
                        active={
                            selectedStatus ===
                            "changes_required"
                        }
                        color="orange"
                        onClick={() =>
                            selectStatusAndScroll(
                                "changes_required"
                            )
                        }
                    />

                </section>

                {/* ==================================================
                    REVIEW QUEUE
                ================================================== */}

                <section
                    id="review-queue"
                    style={styles.queueSection}
                >

                    <div style={styles.queueHeader}>

                        <div>
                            <div style={styles.sectionEyebrow}>
                                REVIEW QUEUE
                            </div>

                            <h2 style={styles.sectionTitle}>
                                My Product Reviews
                            </h2>

                            <p style={styles.sectionSubtitle}>
                                {selectedStatus === "all"
                                    ? "All products currently assigned to you."
                                    : `Showing ${getStatusLabel(
                                          selectedStatus
                                      ).toLowerCase()} products.`}
                            </p>
                        </div>

                        <div style={styles.queueCount}>
                            {filteredReviews.length}{" "}
                            {filteredReviews.length ===
                            1
                                ? "Product"
                                : "Products"}
                        </div>

                    </div>

                    {/* FILTER BAR */}

                    <div style={styles.filterBar}>

                        <div style={styles.searchWrapper}>
                            <span style={styles.searchIcon}>
                                ⌕
                            </span>

                            <input
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search product, seller, category or ID..."
                                style={styles.searchInput}
                            />
                        </div>

                        <select
                            value={selectedStatus}
                            onChange={(e) =>
                                setSelectedStatus(
                                    e.target.value
                                )
                            }
                            style={styles.select}
                        >
                            <option value="all">
                                All Statuses
                            </option>

                            <option value="assigned">
                                Ready for Review
                            </option>

                            <option value="in_review">
                                In Review
                            </option>

                            <option value="approved">
                                Approved
                            </option>

                            <option value="rejected">
                                Rejected
                            </option>

                            <option value="changes_required">
                                Changes Required
                            </option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(
                                    e.target.value
                                )
                            }
                            style={styles.select}
                        >
                            <option value="newest">
                                Newest First
                            </option>

                            <option value="oldest">
                                Oldest First
                            </option>

                            <option value="name">
                                Product Name
                            </option>
                        </select>

                        {selectedStatus !==
                            "all" && (
                            <button
                                onClick={() =>
                                    setSelectedStatus(
                                        "all"
                                    )
                                }
                                style={
                                    styles.clearButton
                                }
                            >
                                Clear
                            </button>
                        )}

                    </div>

                    {/* EMPTY */}

                    {filteredReviews.length === 0 ? (
                        <div style={styles.emptyState}>

                            <div style={styles.emptyIllustration}>
                                ✓
                            </div>

                            <h3>
                                {search
                                    ? "No products found"
                                    : selectedStatus ===
                                      "all"
                                    ? "No review records"
                                    : `No ${getStatusLabel(
                                          selectedStatus
                                      )} products`}
                            </h3>

                            <p>
                                {search
                                    ? "Try changing your search or filter."
                                    : "Products assigned to you will appear here."}
                            </p>

                            {search && (
                                <button
                                    onClick={() =>
                                        setSearch("")
                                    }
                                    style={
                                        styles.primaryButton
                                    }
                                >
                                    Clear Search
                                </button>
                            )}

                        </div>
                    ) : (

                        <div style={styles.productList}>

                            {filteredReviews.map(
                                (review) => {

                                    const product =
                                        getProduct(
                                            review
                                        );

                                    const productId =
                                        getProductId(
                                            review
                                        );

                                    const productName =
                                        getProductName(
                                            review
                                        );

                                    const status =
                                        getDisplayStatus(
                                            review
                                        );

                                    const image =
                                        getProductImage(
                                            review
                                        );

                                    return (
                                        <ProductReviewCard
                                            key={
                                                review.id ||
                                                productId
                                            }
                                            review={
                                                review
                                            }
                                            product={
                                                product
                                            }
                                            productId={
                                                productId
                                            }
                                            productName={
                                                productName
                                            }
                                            status={
                                                status
                                            }
                                            image={
                                                image
                                            }
                                            onOpen={() =>
                                                openProductReview(
                                                    review
                                                )
                                            }
                                        />
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>
        </div>
    );

    // ==========================================================
    // SELECT STATUS
    // ==========================================================

    function selectStatusAndScroll(status) {
        setSelectedStatus(status);

        setTimeout(() => {
            document
                .getElementById("review-queue")
                ?.scrollIntoView({
                    behavior: "smooth",
                });
        }, 50);
    }
}

// ==========================================================
// STAT CARD
// ==========================================================

function StatCard({
    title,
    number,
    icon,
    color,
    active,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                ...styles.statCard,
                ...(active
                    ? styles.statCardActive
                    : {}),
            }}
        >
            <div style={styles.statTop}>
                <div
                    style={{
                        ...styles.statIcon,
                        ...getIconColor(color),
                    }}
                >
                    {icon}
                </div>

                <span style={styles.statArrow}>
                    →
                </span>
            </div>

            <div style={styles.statNumber}>
                {number}
            </div>

            <div style={styles.statTitle}>
                {title}
            </div>
        </button>
    );
}

// ==========================================================
// PRODUCT CARD
// ==========================================================

function ProductReviewCard({
    product,
    productId,
    productName,
    status,
    image,
    review,
    onOpen,
}) {
    const [imageError, setImageError] =
        useState(false);

    const seller =
        product.seller_name ||
        product.seller?.name ||
        product.seller?.email ||
        "Seller not available";

    const category =
        product.category ||
        product.item_type ||
        "Uncategorized";

    const price =
        product.price !== undefined &&
        product.price !== null
            ? `₹${product.price}`
            : "Price unavailable";

    return (
        <article style={styles.productCard}>

            {/* IMAGE */}

            <div style={styles.productImageBox}>

                {image && !imageError ? (
                    <img
                        src={image}
                        alt={productName}
                        style={styles.productImage}
                        onError={() =>
                            setImageError(
                                true
                            )
                        }
                    />
                ) : (
                    <div
                        style={
                            styles.imageFallback
                        }
                    >
                        <span>▦</span>
                        <small>
                            No Image
                        </small>
                    </div>
                )}

            </div>

            {/* CONTENT */}

            <div style={styles.productContent}>

                <div style={styles.productHeading}>

                    <div style={{ minWidth: 0 }}>

                        <div style={styles.productId}>
                            PRODUCT #
                            {productId || "—"}
                        </div>

                        <h3 style={styles.productName}>
                            {productName}
                        </h3>

                    </div>

                    <StatusBadge
                        status={status}
                    />

                </div>

                <div style={styles.productDetails}>

                    <Detail
                        label="Seller"
                        value={seller}
                    />

                    <Detail
                        label="Category"
                        value={category}
                    />

                    <Detail
                        label="Price"
                        value={price}
                    />

                    <Detail
                        label="Review ID"
                        value={
                            review.id ||
                            "—"
                        }
                    />

                </div>

                {product.description && (
                    <p
                        style={
                            styles.productDescription
                        }
                    >
                        {product.description}
                    </p>
                )}

                {(review.reason ||
                    review.review_reason) && (
                    <div
                        style={
                            styles.reviewNote
                        }
                    >
                        <span>
                            !
                        </span>

                        <div>
                            <strong>
                                Review Note
                            </strong>

                            <p>
                                {review.reason ||
                                    review.review_reason}
                            </p>
                        </div>
                    </div>
                )}

                {Array.isArray(
                    review.issues
                ) &&
                    review.issues.length >
                        0 && (
                        <div
                            style={
                                styles.issues
                            }
                        >
                            <strong>
                                Issues Found
                            </strong>

                            <ul>
                                {review.issues.map(
                                    (
                                        issue,
                                        index
                                    ) => (
                                        <li
                                            key={
                                                issue.id ||
                                                index
                                            }
                                        >
                                            <b>
                                                {
                                                    issue.field
                                                }
                                                :
                                            </b>{" "}
                                            {
                                                issue.comment
                                            }
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}

            </div>

            {/* ACTION */}

            <div style={styles.productAction}>

                <button
                    onClick={onOpen}
                    style={
                        status ===
                        "assigned"
                            ? styles.startButton
                            : styles.viewButton
                    }
                >
                    {status ===
                    "assigned"
                        ? "Start Review"
                        : status ===
                          "in_review"
                        ? "Continue Review"
                        : "View Review"}

                    <span>
                        →
                    </span>
                </button>

            </div>

        </article>
    );
}

// ==========================================================
// DETAIL
// ==========================================================

function Detail({ label, value }) {
    return (
        <div style={styles.detail}>
            <span>
                {label}
            </span>

            <strong title={value}>
                {value}
            </strong>
        </div>
    );
}

// ==========================================================
// STATUS BADGE
// ==========================================================

function StatusBadge({ status }) {
    const config = {
        assigned: {
            text: "Ready for Review",
            background: "#fff7df",
            color: "#9a6700",
            dot: "#e7a600",
        },

        in_review: {
            text: "In Review",
            background: "#eaf3ff",
            color: "#2161c5",
            dot: "#2878e8",
        },

        approved: {
            text: "Approved",
            background: "#eaf8f0",
            color: "#147a46",
            dot: "#1ca45d",
        },

        rejected: {
            text: "Rejected",
            background: "#fff0f0",
            color: "#c62828",
            dot: "#e53935",
        },

        changes_required: {
            text: "Changes Required",
            background: "#fff4e8",
            color: "#b45309",
            dot: "#f59e0b",
        },

        completed: {
            text: "Completed",
            background: "#f1f3f5",
            color: "#495057",
            dot: "#6c757d",
        },
    };

    const current =
        config[status] ||
        config.completed;

    return (
        <span
            style={{
                ...styles.statusBadge,
                background:
                    current.background,
                color: current.color,
            }}
        >
            <span
                style={{
                    ...styles.statusDot,
                    background:
                        current.dot,
                }}
            />

            {current.text}
        </span>
    );
}

// ==========================================================
// HELPERS
// ==========================================================

function getInitials(name = "") {
    if (!name) return "CW";

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) =>
            word.charAt(0).toUpperCase()
        )
        .join("");
}

function getIconColor(color) {
    const colors = {
        green: {
            background: "#e8f5ee",
            color: "#18794e",
        },

        yellow: {
            background: "#fff7df",
            color: "#9a6700",
        },

        blue: {
            background: "#eaf3ff",
            color: "#2161c5",
        },

        red: {
            background: "#fff0f0",
            color: "#c62828",
        },

        orange: {
            background: "#fff4e8",
            color: "#b45309",
        },
    };

    return colors[color] || colors.green;
}

// ==========================================================
// STYLES
// ==========================================================

const styles = {
    app: {
        minHeight: "100vh",
        background: "#f5f7f6",
        display: "flex",
        color: "#17201c",
        fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },

    // ========================================================
    // SIDEBAR
    // ========================================================

    sidebar: {
        width: "250px",
        minHeight: "100vh",
        background: "#102a21",
        color: "#fff",
        padding: "25px 18px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
    },

    sidebarLogo: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "5px 10px 28px",
        borderBottom:
            "1px solid rgba(255,255,255,0.09)",
    },

    logoMark: {
        width: "40px",
        height: "40px",
        borderRadius: "11px",
        background: "#2b8a63",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "13px",
        letterSpacing: "1px",
    },

    logoText: {
        fontSize: "17px",
        fontWeight: "800",
    },

    logoSub: {
        marginTop: "3px",
        fontSize: "11px",
        color: "#8eaaa0",
    },

    sidebarSection: {
        marginTop: "30px",
    },

    sidebarLabel: {
        padding: "0 12px",
        marginBottom: "10px",
        fontSize: "10px",
        fontWeight: "800",
        color: "#729087",
        letterSpacing: "1.4px",
    },

    navItem: {
        width: "100%",
        padding: "12px",
        marginBottom: "4px",
        border: "none",
        borderRadius: "9px",
        background: "transparent",
        color: "#a8bbb4",
        display: "flex",
        alignItems: "center",
        gap: "11px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        textAlign: "left",
    },

    navItemActive: {
        background: "#1c4638",
        color: "#fff",
    },

    navBadge: {
        marginLeft: "auto",
        minWidth: "22px",
        height: "22px",
        padding: "0 6px",
        borderRadius: "11px",
        background: "#2b8a63",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
    },

    sidebarBottom: {
        marginTop: "auto",
        borderTop:
            "1px solid rgba(255,255,255,0.09)",
        paddingTop: "18px",
    },

    reviewerBox: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px",
    },

    avatar: {
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "#d7efe4",
        color: "#176744",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "800",
    },

    reviewerName: {
        color: "#fff",
        fontSize: "12px",
        fontWeight: "700",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "145px",
    },

    reviewerRole: {
        marginTop: "2px",
        color: "#78938a",
        fontSize: "10px",
    },

    sidebarLogout: {
        width: "100%",
        marginTop: "12px",
        padding: "10px",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        background: "transparent",
        color: "#9db0aa",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "600",
    },

    // ========================================================
    // MAIN
    // ========================================================

    main: {
        flex: 1,
        minWidth: 0,
        padding: "30px 36px 50px",
        boxSizing: "border-box",
    },

    topHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "25px",
        marginBottom: "30px",
    },

    breadcrumb: {
        color: "#81908a",
        fontSize: "11px",
        fontWeight: "700",
        marginBottom: "8px",
    },

    pageTitle: {
        margin: 0,
        fontSize: "28px",
        lineHeight: 1.2,
        color: "#18231e",
        fontWeight: "800",
        letterSpacing: "-0.5px",
    },

    pageSubtitle: {
        margin: "8px 0 0",
        color: "#7b8983",
        fontSize: "13px",
    },

    headerActions: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },

    refreshButton: {
        padding: "10px 15px",
        border: "1px solid #dbe3df",
        borderRadius: "9px",
        background: "#fff",
        color: "#31554a",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        gap: "7px",
    },

    headerProfile: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        paddingLeft: "15px",
        borderLeft: "1px solid #dce4e0",
    },

    headerAvatar: {
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        background: "#dff0e8",
        color: "#176744",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "800",
    },

    // ========================================================
    // STATS
    // ========================================================

    statsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(175px, 1fr))",
        gap: "14px",
        marginBottom: "28px",
    },

    statCard: {
        border: "1px solid #e1e8e4",
        borderRadius: "13px",
        background: "#fff",
        padding: "18px",
        textAlign: "left",
        cursor: "pointer",
        minHeight: "140px",
        transition: "0.2s ease",
        boxShadow:
            "0 2px 8px rgba(20,45,35,0.03)",
    },

    statCardActive: {
        border:
            "1.5px solid #27835d",
        boxShadow:
            "0 5px 18px rgba(39,131,93,0.12)",
        transform: "translateY(-2px)",
    },

    statTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },

    statIcon: {
        width: "34px",
        height: "34px",
        borderRadius: "9px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "15px",
    },

    statArrow: {
        color: "#a8b3ae",
        fontSize: "15px",
    },

    statNumber: {
        marginTop: "15px",
        fontSize: "27px",
        fontWeight: "850",
        color: "#1c2c25",
    },

    statTitle: {
        marginTop: "3px",
        color: "#77857f",
        fontSize: "11px",
        fontWeight: "700",
    },

    // ========================================================
    // QUEUE
    // ========================================================

    queueSection: {
        background: "#fff",
        border: "1px solid #e2e9e5",
        borderRadius: "15px",
        padding: "25px",
        boxShadow:
            "0 3px 12px rgba(20,45,35,0.035)",
    },

    queueHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "20px",
        marginBottom: "20px",
    },

    sectionEyebrow: {
        color: "#29815d",
        fontSize: "10px",
        fontWeight: "850",
        letterSpacing: "1.3px",
        marginBottom: "5px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "20px",
        fontWeight: "800",
        color: "#1b2923",
    },

    sectionSubtitle: {
        margin: "5px 0 0",
        color: "#8a9691",
        fontSize: "12px",
    },

    queueCount: {
        padding: "8px 13px",
        borderRadius: "8px",
        background: "#eef7f2",
        color: "#217451",
        fontSize: "11px",
        fontWeight: "800",
        whiteSpace: "nowrap",
    },

    // ========================================================
    // FILTER BAR
    // ========================================================

    filterBar: {
        display: "flex",
        gap: "10px",
        alignItems: "center",
        padding: "12px",
        borderRadius: "10px",
        background: "#f7f9f8",
        border: "1px solid #edf1ef",
        marginBottom: "17px",
        flexWrap: "wrap",
    },

    searchWrapper: {
        flex: 1,
        minWidth: "230px",
        position: "relative",
    },

    searchIcon: {
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#9aa7a1",
        fontSize: "17px",
    },

    searchInput: {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px 10px 35px",
        border: "1px solid #dfe7e3",
        borderRadius: "8px",
        background: "#fff",
        outline: "none",
        fontSize: "12px",
        color: "#26362f",
    },

    select: {
        padding: "10px 12px",
        border: "1px solid #dfe7e3",
        borderRadius: "8px",
        background: "#fff",
        color: "#52615a",
        outline: "none",
        fontSize: "11px",
        fontWeight: "600",
        cursor: "pointer",
    },

    clearButton: {
        padding: "10px 13px",
        border: "none",
        borderRadius: "8px",
        background: "#e8f4ee",
        color: "#217451",
        fontWeight: "700",
        fontSize: "11px",
        cursor: "pointer",
    },

    // ========================================================
    // PRODUCT LIST
    // ========================================================

    productList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    productCard: {
        display: "flex",
        alignItems: "stretch",
        gap: "17px",
        padding: "16px",
        border: "1px solid #e4eae7",
        borderRadius: "12px",
        background: "#fff",
        transition: "0.2s ease",
    },

    productImageBox: {
        width: "125px",
        minWidth: "125px",
        height: "125px",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#f2f5f3",
        border: "1px solid #e4e9e6",
    },

    productImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },

    imageFallback: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ba8a2",
        gap: "5px",
    },

    productContent: {
        flex: 1,
        minWidth: 0,
    },

    productHeading: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "15px",
    },

    productId: {
        color: "#89958f",
        fontSize: "9px",
        fontWeight: "800",
        letterSpacing: "1px",
        marginBottom: "4px",
    },

    productName: {
        margin: 0,
        color: "#17231e",
        fontSize: "17px",
        fontWeight: "800",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },

    statusBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 9px",
        borderRadius: "20px",
        fontSize: "9px",
        fontWeight: "800",
        whiteSpace: "nowrap",
    },

    statusDot: {
        width: "6px",
        height: "6px",
        borderRadius: "50%",
    },

    productDetails: {
        display: "grid",
        gridTemplateColumns:
            "repeat(4, minmax(100px, 1fr))",
        gap: "15px",
        marginTop: "15px",
    },

    detail: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
    },

    detailSpan: {
        color: "#8c9893",
        fontSize: "9px",
    },

    productDescription: {
        margin: "13px 0 0",
        color: "#6f7c76",
        fontSize: "11px",
        lineHeight: 1.5,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    },

    reviewNote: {
        marginTop: "12px",
        padding: "9px 11px",
        display: "flex",
        gap: "9px",
        borderRadius: "7px",
        background: "#f5f8f6",
        border: "1px solid #e5ebe8",
        color: "#56645d",
        fontSize: "10px",
    },

    issues: {
        marginTop: "10px",
        padding: "9px 11px",
        borderRadius: "7px",
        background: "#fff7ed",
        border: "1px solid #fde8d0",
        color: "#9a5b19",
        fontSize: "10px",
    },

    productAction: {
        width: "135px",
        minWidth: "135px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    startButton: {
        width: "100%",
        padding: "11px 10px",
        border: "none",
        borderRadius: "8px",
        background: "#227952",
        color: "#fff",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: "800",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
    },

    viewButton: {
        width: "100%",
        padding: "10px",
        border: "1px solid #27835d",
        borderRadius: "8px",
        background: "#fff",
        color: "#227952",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: "800",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
    },

    // ========================================================
    // EMPTY
    // ========================================================

    emptyState: {
        textAlign: "center",
        padding: "65px 20px",
        color: "#7b8983",
    },

    emptyIllustration: {
        width: "58px",
        height: "58px",
        margin: "0 auto 14px",
        borderRadius: "50%",
        background: "#eaf5ef",
        color: "#27835d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "25px",
        fontWeight: "800",
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
        marginTop: "15px",
        padding: "10px 18px",
        border: "none",
        borderRadius: "8px",
        background: "#227952",
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "700",
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingPage: {
        minHeight: "100vh",
        background: "#f5f7f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    loaderCard: {
        width: "300px",
        padding: "35px",
        borderRadius: "16px",
        background: "#fff",
        textAlign: "center",
        boxShadow:
            "0 10px 35px rgba(20,45,35,0.08)",
    },

    logoCircle: {
        width: "48px",
        height: "48px",
        margin: "0 auto",
        borderRadius: "13px",
        background: "#227952",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "12px",
    },

    loader: {
        width: "25px",
        height: "25px",
        margin: "20px auto",
        border: "3px solid #e2eee8",
        borderTopColor: "#227952",
        borderRadius: "50%",
        animation:
            "spin 0.8s linear infinite",
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorPage: {
        minHeight: "100vh",
        background: "#f5f7f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
    },

    errorCard: {
        maxWidth: "450px",
        width: "100%",
        padding: "40px",
        borderRadius: "16px",
        background: "#fff",
        textAlign: "center",
        boxShadow:
            "0 10px 35px rgba(20,45,35,0.08)",
        boxSizing: "border-box",
    },

    errorIcon: {
        width: "45px",
        height: "45px",
        margin: "0 auto 15px",
        borderRadius: "50%",
        background: "#fff0f0",
        color: "#d32f2f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "22px",
    },
};

// ==========================================================
// ADD GLOBAL ANIMATION
// ==========================================================

if (
    typeof document !== "undefined" &&
    !document.getElementById(
        "clayware-dashboard-animation"
    )
) {
    const style =
        document.createElement("style");

    style.id =
        "clayware-dashboard-animation";

    style.innerHTML = `
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }

        button:hover {
            opacity: 0.94;
        }

        input:focus,
        select:focus {
            border-color: #27835d !important;
            box-shadow: 0 0 0 3px rgba(39,131,93,0.08);
        }

        @media (max-width: 1100px) {
            .product-details {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 850px) {
            aside {
                display: none !important;
            }
        }

        @media (max-width: 700px) {
            main {
                padding: 20px 15px !important;
            }
        }
    `;

    document.head.appendChild(style);
}

export default Dashboard;