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

