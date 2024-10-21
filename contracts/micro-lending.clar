;; micro-lending
;; A decentralized peer-to-peer micro-lending platform

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-invalid-amount (err u102))
(define-constant err-insufficient-balance (err u103))
(define-constant err-loan-exists (err u104))
(define-constant err-unauthorized (err u105))
(define-constant err-loan-not-due (err u106))

;; Data Variables
(define-data-var minimum-loan-amount uint u1000000) ;; in micro STX (1 STX)
(define-data-var platform-fee-rate uint u10) ;; 1% represented as 10/1000

;; Data Maps
(define-map user-reputation
    principal
    {
        loans-paid: uint,
        loans-defaulted: uint,
        lending-score: uint,
        total-borrowed: uint,
        total-lent: uint
    }
)

(define-map loans
    uint
    {
        borrower: principal,
        lender: principal,
        amount: uint,
        interest-rate: uint,
        duration: uint,
        start-block: uint,
        status: (string-ascii 20),
        collateral: uint
    }
)

(define-data-var loan-nonce uint u0)

;; Private Functions
(define-private (calculate-repayment-amount (loan-id uint))
    (let (
        (loan (unwrap! (map-get? loans loan-id) (err u101)))
        (interest-amount (/ (* (get amount loan) (get interest-rate loan)) u1000))
    )
    (+ (get amount loan) interest-amount))
)

(define-private (update-reputation (user principal) (paid bool))
    (let (
        (current-rep (default-to
            {
                loans-paid: u0,
                loans-defaulted: u0,
                lending-score: u50,
                total-borrowed: u0,
                total-lent: u0
            }
            (map-get? user-reputation user)
        ))
    )
    (if paid
        (map-set user-reputation user
            (merge current-rep {
                loans-paid: (+ (get loans-paid current-rep) u1),
                lending-score: (min u100 (+ (get lending-score current-rep) u10))
            })
        )
        (map-set user-reputation user
            (merge current-rep {
                loans-defaulted: (+ (get loans-defaulted current-rep) u1),
                lending-score: (max u0 (- (get lending-score current-rep) u20))
            })
        )
    ))
)

;; Public Functions
(define-public (create-loan (amount uint) (interest-rate uint) (duration uint) (collateral uint))
    (let (
        (loan-id (+ (var-get loan-nonce) u1))
    )
    (asserts! (>= amount (var-get minimum-loan-amount)) err-invalid-amount)
    (asserts! (>= (stx-get-balance tx-sender) collateral) err-insufficient-balance)

    ;; Transfer collateral to contract
    (try! (stx-transfer? collateral tx-sender (as-contract tx-sender)))

    ;; Create loan
    (map-set loans loan-id {
        borrower: tx-sender,
        lender: tx-sender,
        amount: amount,
        interest-rate: interest-rate,
        duration: duration,
        start-block: u0,
        status: "CREATED",
        collateral: collateral
    })

    ;; Update nonce
    (var-set loan-nonce loan-id)
    (ok loan-id))
)
