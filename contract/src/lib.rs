/*!
Fungible Token implementation with JSON serialization.
NOTES:
  - The maximum balance value is limited by U128 (2**128 - 1).
  - JSON calls should pass U128 as a base-10 string. E.g. "100".
  - The contract optimizes the inner trie structure by hashing account IDs. It will prevent some
    abuse of deep tries. Shouldn't be an issue, once NEAR clients implement full hashing of keys.
  - The contract tracks the change in storage before and after the call. If the storage increases,
    the contract requires the caller of the contract to attach enough deposit to the function call
    to cover the storage cost.
    This is done to prevent a denial of service attack on the contract by taking all available storage.
    If the storage decreases, the contract will issue a refund for the cost of the released storage.
    The unused tokens from the attached deposit are also refunded, so it's safe to
    attach more deposit than required.
  - To prevent the deployed contract from being modified or deleted, it should not have any access
    keys on its account.
*/
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::FungibleToken;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::{env, log, near_bindgen, AccountId, Balance, PanicOnDefault, PromiseOrValue};
use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::events::FtBurn;
use near_sdk::{Promise, PromiseResult};
use near_sdk::ext_contract;
use near_sdk::Gas;
use crate::action::SwapAction;

mod action;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    metadata: LazyOption<FungibleTokenMetadata>,
    owner_account: AccountId,
    admin_account: AccountId,
    fund_account: AccountId,
    ex_balances: Vec<u128>,
}

const DATA_IMAGE_PNG_NEAR_ICON: &str = "data:image/png;base64,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";
const ASSETS: &[&str] = &["banana.ft-fin.testnet", "rft.tokenfactory.testnet", "nusdc.ft-fin.testnet"]; //We assume the coins have all at least 8 decimals of precision
const POOL_IDS: &[u64] = &[15, 24, 30]; //We assume the pools have all enough liquidity
const DEC_PREC: u128 = 10u128.pow(8);
const FEE_PERC: u128 = 2;

#[ext_contract(ext_contract_b)]
pub trait Wrapnear {
    fn near_deposit(&mut self);
    fn near_withdraw(&mut self, amount: U128) -> Promise;
}

#[ext_contract(ext_ft)]
pub trait FungibleToken {
    fn ft_balance_of(&mut self, account_id: AccountId) -> U128;
    fn get_return(&mut self, pool_id: u64, token_in: AccountId, amount_in: U128, token_out: AccountId) -> U128;
    fn swap(&mut self, actions: Vec<SwapAction>, referral_id: Option<AccountId>) -> U128;
    fn register_tokens(&mut self, token_ids: Vec<AccountId>);
    fn storage_deposit(&mut self, account_id: AccountId, registration_only: bool);
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, msg: String) -> U128;
    fn withdraw(&mut self, token_id: AccountId, amount: U128, unregister: Option<bool>) -> Promise;
    fn get_deposit(&mut self, account_id: AccountId, token_id: AccountId) -> U128;
}

// define methods we'll use as callbacks on our contract
#[ext_contract(ext_self)]
pub trait MyContract {
    fn callback_buy(&mut self, account: AccountId, amount: u128) -> Promise;
    fn callback_sell(&mut self, account: AccountId, tokens: u128) -> Promise;
    fn callback_retract(&mut self, new_balance: Vec<u128>) -> Promise;
    fn callback_ini(&mut self);
    fn update_ex_balances(&mut self) -> Promise;
}
   
#[near_bindgen]
impl Contract {
    /// Initializes the contract with the given total supply owned by the given `owner_id` with
    /// default metadata (for example purposes only).
    #[init]
    pub fn new_default_meta(owner_id: AccountId, total_supply: U128, admin_id: AccountId, fund_id: AccountId) -> Self {
        Self::new(
            owner_id,
            total_supply,
            admin_id,
            fund_id,
            FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "Serpius".to_string(),
                symbol: "SER".to_string(),
                icon: Some(DATA_IMAGE_PNG_NEAR_ICON.to_string()),
                reference: None,
                reference_hash: None,
                decimals: 24,
            },

        )
    }

    /// Initializes the contract with the given total supply owned by the given `owner_id` with
    /// the given fungible token metadata.
    #[init]
    pub fn new(
        owner_id: AccountId,
        total_supply: U128,
        admin_id: AccountId,
        fund_id: AccountId,
        metadata: FungibleTokenMetadata,
    ) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        metadata.assert_valid();
        let mut this = Self {
            token: FungibleToken::new(b"a".to_vec()),
            metadata: LazyOption::new(b"m".to_vec(), Some(&metadata)),
            owner_account: owner_id.clone(),
            admin_account: admin_id.clone(),
            fund_account: fund_id.clone(),
            ex_balances: vec![0; ASSETS.iter().len()+1],
        };
        this.token.internal_register_account(&owner_id);
        this.token.internal_register_account(&admin_id);
        this.token.internal_register_account(&fund_id);
        this.token.internal_deposit(&owner_id, total_supply.into());        
        near_contract_standards::fungible_token::events::FtMint {
            owner_id: &owner_id,
            amount: &total_supply,
            memo: Some("Initial tokens supply is minted"),
        }
        .emit();
        this
    }

    #[payable]
    pub fn ini_register(&mut self) -> Promise {
        assert_eq!( env::predecessor_account_id(), self.owner_account, "Only owner can call this function." );
        let mut token_accounts: Vec<AccountId> = Vec::new();
        token_accounts.push("wrap.testnet".parse().unwrap());
        for x in ASSETS {
            token_accounts.push(x.parse().unwrap());
        }
        ext_ft::storage_deposit(env::current_account_id(), false, "ref-finance.testnet".parse().unwrap(), env::attached_deposit(), Gas(5_000_000_000_000))
        .and(ext_ft::register_tokens(token_accounts, "ref-finance.testnet".parse().unwrap(), 1, Gas(5_000_000_000_000)))
        .then(ext_ft::get_deposit(env::current_account_id(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[0].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[1].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[2].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .then(ext_self::callback_ini(env::current_account_id(), 0, Gas(50_000_000_000_000)))
    }

    pub fn callback_ini(&mut self) {
        assert!(env::promise_results_count()==6 || env::promise_results_count()==4, "This is a callback method");
        if env::promise_results_count()==6 {
           for x in 2..6 {
                match env::promise_result(x) {
                    PromiseResult::NotReady => unreachable!(),
                    PromiseResult::Failed => {},
                    PromiseResult::Successful(result) => {
                        let balance: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                        self.ex_balances[(x as usize)-2] = balance;
                    },
                }
            }
        }else{
            for x in 0..4 {
                match env::promise_result(x) {
                    PromiseResult::NotReady => unreachable!(),
                    PromiseResult::Failed => {},
                    PromiseResult::Successful(result) => {
                        let balance: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                        self.ex_balances[(x as usize)] = balance;
                    },
                }
            }
        }

    }

    pub fn update_ex_balances(&mut self) -> Promise {

        ext_ft::get_deposit(env::current_account_id(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[0].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[1].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[2].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .then(ext_self::callback_ini(env::current_account_id(), 0, Gas(50_000_000_000_000)))

    }

    #[payable]
    pub fn buy_token(&mut self) -> Promise {
        assert!(env::attached_deposit() > 0, "You need to send NEAR tokens"); //Check if there is NEAR sent.

        if !self.token.accounts.contains_key(&env::predecessor_account_id()) {
            self.token.internal_register_account(&env::predecessor_account_id());
        }

        ext_ft::get_return(POOL_IDS[0], ASSETS[0].parse().unwrap(), self.ex_balances[1].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000))
        .and(ext_ft::get_return(POOL_IDS[1], ASSETS[1].parse().unwrap(), self.ex_balances[2].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .and(ext_ft::get_return(POOL_IDS[2], ASSETS[2].parse().unwrap(), self.ex_balances[3].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
        .then(ext_self::callback_buy(
            env::predecessor_account_id(),
            env::attached_deposit(),    
            env::current_account_id(), // this contract's account id
            0, // yocto NEAR to attach to the callback
            Gas(200_000_000_000_000) // gas to attach to the callback
        ))
    }

    pub fn callback_buy(&mut self, account: AccountId, amount: u128) -> Promise {
        assert_eq!(env::promise_results_count(), 3, "This is a callback method");
        // handle the result from the cross contract call this method is a callback for
        let mut total_balance: u128 = self.ex_balances[0];
        env::log_str(&total_balance.to_string());    
        for x in 0..3 {
            match env::promise_result(x) {
                PromiseResult::NotReady => unreachable!(),
                PromiseResult::Failed => {env::log_str("Balance probably zero for this asset.");},
                PromiseResult::Successful(result) => {
                    let ex: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                    if self.ex_balances[(x as usize)+1] > 0 {
                        total_balance += ex;
                        env::log_str(&ex.to_string());    
                    }
                },
            }
        }

        let supply: u128 = self.token.total_supply;
        let mut price: u128 = DEC_PREC;
        if supply > 0 {
            if total_balance.checked_mul(DEC_PREC).is_none() {
                price = ( total_balance / supply ) * DEC_PREC;
            }else{
                price = ( total_balance * DEC_PREC ) / supply;
            }
        }  

        let mut tokens = amount;
        if price > 0 {
            if amount.checked_mul(DEC_PREC).is_none() {
                tokens = ( amount / price ) * DEC_PREC;
            }else{
                tokens = ( amount * DEC_PREC ) / price;
            }
        }
        let token_rec = ( ( 100 - FEE_PERC ) * tokens ) / 100;
        let token_admin = ( FEE_PERC * tokens ) / 200;
        let token_fund = ( FEE_PERC * tokens ) / 200;

        self.token.internal_deposit(&account, token_rec);
        self.token.internal_deposit(&self.admin_account, token_admin);
        self.token.internal_deposit(&self.fund_account, token_fund);

        log!("Total Balance: {}", &total_balance.to_string());
        log!("Total Supply: {}", &supply.to_string());
        log!("Actual Price: {}", &price.to_string());
        log!("Amount NEAR paid: {}", &amount.to_string());

        let ntokens: U128 = tokens.into(); 
        FtMint {
            owner_id: &account,
            amount: &ntokens,
            memo: Some("Tokens have been minted"),
        }
        .emit();

        ext_contract_b::near_deposit("wrap.testnet".parse().unwrap(), amount, Gas(5_000_000_000_000))
        .then( ext_ft::ft_transfer_call("ref-finance.testnet".parse().unwrap(), U128(amount), "".into(), "wrap.testnet".parse().unwrap(), 1, Gas(40_000_000_000_000)) )
        .then( ext_self::update_ex_balances( env::current_account_id(), 0, Gas(100_000_000_000_000) ) )

    }

    pub fn sell_token(&mut self, tokens: U128) -> Promise {
        assert!(tokens.0 > 0, "You need to send SER tokens"); //Check if there is NEAR sent.
        assert!( self.ft_balance_of(env::predecessor_account_id()).0 >= tokens.0, "You do not have enough balance." ); //Check if there is NEAR sent.

        let token_rec = ( ( 100 - FEE_PERC )* tokens.0 ) / 100;
        let token_admin = ( FEE_PERC * tokens.0 ) / 200;
        let token_fund = ( FEE_PERC * tokens.0 ) / 200;

        self.token.internal_withdraw(&env::predecessor_account_id(), token_admin + token_fund);
        self.token.internal_deposit(&self.admin_account, token_admin);
        self.token.internal_deposit(&self.fund_account, token_fund);

        let supply: u128 = self.token.total_supply;
        let mut actions: Vec<SwapAction> = Vec::new();
        for x in 0..3 {
            let value: u128;
            if self.ex_balances[(x as usize)+1].checked_mul(token_rec).is_none() {
                value = ( self.ex_balances[(x as usize)+1] / supply ) * token_rec;
            }else{
                value = ( self.ex_balances[(x as usize)+1] * token_rec ) / supply;
            }
            if value > 0 {
                actions.push( SwapAction {
                    pool_id: POOL_IDS[x],
                    token_in: ASSETS[x].parse().unwrap(),
                    amount_in: Some(U128( value )),
                    token_out: "wrap.testnet".parse().unwrap(),
                    min_amount_out: U128(1),
                } );
            }   
        }       

        if actions.iter().len() > 0 {
            ext_ft::swap( actions, None, "ref-finance.testnet".parse().unwrap(), 1, Gas(50_000_000_000_000) )
            .then(ext_ft::get_return(POOL_IDS[0], ASSETS[0].parse().unwrap(), self.ex_balances[1].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_return(POOL_IDS[1], ASSETS[1].parse().unwrap(), self.ex_balances[2].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_return(POOL_IDS[2], ASSETS[2].parse().unwrap(), self.ex_balances[3].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .then(ext_self::callback_sell(
                env::predecessor_account_id(),
                token_rec,    
                env::current_account_id(), // this contract's account id
                0, // yocto NEAR to attach to the callback
                Gas(200_000_000_000_000) // gas to attach to the callback
            ))
        }else{
            ext_ft::get_return(POOL_IDS[0], ASSETS[0].parse().unwrap(), self.ex_balances[1].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000))
            .and(ext_ft::get_return(POOL_IDS[1], ASSETS[1].parse().unwrap(), self.ex_balances[2].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_return(POOL_IDS[2], ASSETS[2].parse().unwrap(), self.ex_balances[3].max(1).into(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .then(ext_self::callback_sell(
                env::predecessor_account_id(),
                token_rec,    
                env::current_account_id(), // this contract's account id
                0, // yocto NEAR to attach to the callback
                Gas(200_000_000_000_000) // gas to attach to the callback
            ))
        }
    }

    pub fn callback_sell(&mut self, account: AccountId, tokens: u128) -> Promise {
        assert!(env::promise_results_count()==4 || env::promise_results_count()==3, "This is a callback method");
        // handle the result from the cross contract call this method is a callback for
        let mut total_balance: u128 = self.ex_balances[0];
        env::log_str(&total_balance.to_string());    
        for x in 0..3 {
            match env::promise_result(x) {
                PromiseResult::NotReady => unreachable!(),
                PromiseResult::Failed => {},
                PromiseResult::Successful(result) => {
                    let ex: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                    if self.ex_balances[(x as usize)+1] > 0 {
                        total_balance += ex;
                        env::log_str(&ex.to_string());    
                    }
                },
            }
        }

        let supply: u128 = self.token.total_supply;
        let mut price: u128 = DEC_PREC;
        if supply > 0 {
            if total_balance.checked_mul(DEC_PREC).is_none() {
                price = ( total_balance / supply ) * DEC_PREC;
            }else{
                price = ( total_balance * DEC_PREC ) / supply;
            }
        }  

        let mut wnear = tokens;
        if price > 0 {
            if price.checked_mul(tokens).is_none(){
                wnear = ( price / DEC_PREC ) * tokens;
            }else{
                wnear = ( price * tokens ) / DEC_PREC;
            }
        }

        log!("Total Balance: {}", &total_balance.to_string());
        log!("Total Supply: {}", &supply.to_string());
        log!("Actual Price: {}", &price.to_string());
        log!("Amount Tokens to exchange: {} and receiving: {} NEAR", &tokens.to_string(), &wnear.to_string());

        self.token.internal_withdraw(&account, tokens);
        log!("New total supply after burning: {}", self.token.total_supply);

        FtBurn {owner_id: &account, amount: &tokens.into(), memo: Some("Tokens have been burnt")}.emit();
       
        ext_ft::withdraw("wrap.testnet".parse().unwrap(), U128(wnear), Some(false), "ref-finance.testnet".parse().unwrap(), 1, Gas(50_000_000_000_000)) 
        .then(ext_contract_b::near_withdraw(wnear.into(), "wrap.testnet".parse().unwrap(), 1, Gas(5_000_000_000_000)))
        .then(ext_self::update_ex_balances( env::current_account_id(), 0, Gas(100_000_000_000_000)))
        .then( Promise::new(account).transfer(wnear.into()) )

    }

    pub fn rebalance_portfolio(&mut self, new_balance: Vec<u128>) -> Promise {
        assert_eq!( env::predecessor_account_id(), self.owner_account, "Only owner can call this function." );
        assert_eq!(new_balance.iter().sum::<u128>(), 1000, "Sum of portfolio must be 1000.");

        let mut actions: Vec<SwapAction> = Vec::new();
        for x in 0..4 {
            if self.ex_balances[x] > 0 && x > 0 {
                actions.push( SwapAction {
                    pool_id: POOL_IDS[x-1],
                    token_in: ASSETS[x-1].parse().unwrap(),
                    amount_in: Some(U128(self.ex_balances[x])),
                    token_out: "wrap.testnet".parse().unwrap(),
                    min_amount_out: U128(1),
                } );
            }   
        }        

        if actions.iter().len() > 0 {
            ext_ft::swap( actions, None, "ref-finance.testnet".parse().unwrap(), 1, Gas(50_000_000_000_000) )
            .then(ext_ft::get_deposit(env::current_account_id(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[0].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[1].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[2].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .then(ext_self::callback_retract(
                new_balance,
                env::current_account_id(), // this contract's account id
                0, // yocto NEAR to attach to the callback
                Gas(200_000_000_000_000) // gas to attach to the callback
            ))
        }else{
            ext_ft::get_deposit(env::current_account_id(), "wrap.testnet".parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[0].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[1].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .and(ext_ft::get_deposit(env::current_account_id(), ASSETS[2].parse().unwrap(), "ref-finance.testnet".parse().unwrap(), 0, Gas(2_000_000_000_000)))
            .then(ext_self::callback_retract(
                new_balance,
                env::current_account_id(), // this contract's account id
                0, // yocto NEAR to attach to the callback
                Gas(200_000_000_000_000) // gas to attach to the callback
            ))
        }
    }

    pub fn callback_retract(&mut self, new_balance: Vec<u128>) -> Promise {
        assert_eq!(new_balance.iter().sum::<u128>(), 1000, "Sum of portfolio must be 1000.");
        assert!(env::promise_results_count()==5 || env::promise_results_count()==4, "This is a callback method");
        // handle the result from the cross contract call this method is a callback for
        let mut balance_vector: Vec<u128> = Vec::new();
        if env::promise_results_count()==5 {
            for x in 1..5 {
                match env::promise_result(x) {
                    PromiseResult::NotReady => unreachable!(),
                    PromiseResult::Failed => {},
                    PromiseResult::Successful(result) => {
                        let balance: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                        balance_vector.push(balance);
                        env::log_str(&balance.to_string());
                    },
                }
            }
        }else{
            for x in 0..4 {
                match env::promise_result(x) {
                    PromiseResult::NotReady => unreachable!(),
                    PromiseResult::Failed => {},
                    PromiseResult::Successful(result) => {
                        let balance: u128 = (near_sdk::serde_json::from_slice::<U128>(&result).unwrap()).0;
                        balance_vector.push(balance);
                        env::log_str(&balance.to_string());
                    },
                }
            }
        }

        let balance_near: u128 = balance_vector[0];
        let mut actions: Vec<SwapAction> = Vec::new();
        for x in 0..3 {
            let value: u128;
            if balance_near.checked_mul(new_balance[x+1]).is_none() {
                value = ( balance_near / 1000 ) * new_balance[x+1];
            }else{
                value = ( balance_near * new_balance[x+1] ) / 1000;
            }
            if ( balance_near * new_balance[x+1] ) / 1000 > 0 {
                actions.push( SwapAction {
                    pool_id: POOL_IDS[x],
                    token_in: "wrap.testnet".parse().unwrap(),
                    amount_in: Some(U128( value )),
                    token_out: ASSETS[x].parse().unwrap(),
                    min_amount_out: U128(1),
                } );
            }
            env::log_str(&( (balance_near * new_balance[x+1]) / 1000 ).to_string() );
        }  

        if actions.iter().len() > 0 {
            ext_ft::swap( actions, None, "ref-finance.testnet".parse().unwrap(), 1, Gas(50_000_000_000_000) )
            .then( ext_self::update_ex_balances( env::current_account_id(), 0, Gas(100_000_000_000_000) ) )
        }else{
            ext_self::update_ex_balances( env::current_account_id(), 0, Gas(100_000_000_000_000) )    
        }
    }

    fn on_account_closed(&mut self, account_id: AccountId, balance: Balance) {
        log!("Closed @{} with {}", account_id, balance);
    }

    fn on_tokens_burned(&mut self, account_id: AccountId, amount: Balance) {
        log!("Account @{} burned {}", account_id, amount);
    }
}

near_contract_standards::impl_fungible_token_core!(Contract, token, on_tokens_burned);
near_contract_standards::impl_fungible_token_storage!(Contract, token, on_account_closed);

#[near_bindgen]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, Balance};

    use super::*;

    const TOTAL_SUPPLY: Balance = 1_000_000_000_000_000;

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_new() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let contract = Contract::new_default_meta(accounts(1).into(), TOTAL_SUPPLY.into());
        testing_env!(context.is_view(true).build());
        assert_eq!(contract.ft_total_supply().0, TOTAL_SUPPLY);
        assert_eq!(contract.ft_balance_of(accounts(1)).0, TOTAL_SUPPLY);
    }

    #[test]
    #[should_panic(expected = "The contract is not initialized")]
    fn test_default() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let _contract = Contract::default();
    }

    #[test]
    fn test_transfer() {
        let mut context = get_context(accounts(2));
        testing_env!(context.build());
        let mut contract = Contract::new_default_meta(accounts(2).into(), TOTAL_SUPPLY.into());
        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(contract.storage_balance_bounds().min.into())
            .predecessor_account_id(accounts(1))
            .build());
        // Paying for account registration, aka storage deposit
        contract.storage_deposit(None, None);

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(1)
            .predecessor_account_id(accounts(2))
            .build());
        let transfer_amount = TOTAL_SUPPLY / 3;
        contract.ft_transfer(accounts(1), transfer_amount.into(), None);

        testing_env!(context
            .storage_usage(env::storage_usage())
            .account_balance(env::account_balance())
            .is_view(true)
            .attached_deposit(0)
            .build());
        assert_eq!(contract.ft_balance_of(accounts(2)).0, (TOTAL_SUPPLY - transfer_amount));
        assert_eq!(contract.ft_balance_of(accounts(1)).0, transfer_amount);
    }
}
