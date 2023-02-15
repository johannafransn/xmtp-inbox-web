import { useState, useEffect } from 'react';
import AddressInput from '../AddressInput';
import { useXmtpStore } from '../../store/xmtp';
import Conversation from './Conversation';
import BackArrow from '../BackArrow';
import useWalletAddress from '../../hooks/useWalletAddress';
import useWindowSize from '../../hooks/useWindowSize';
import { isValidLongWalletAddress, getConversationKey, recipientPillInputStyle } from '../../helpers';
import { useAccount } from 'wagmi';

const RecipientInputMode = {
  InvalidEntry: 0,
  FindingEntry: 1,
  Submitted: 2,
  NotOnNetwork: 3,
  OnNetwork: 4
};

type RecipientControlProps = {
  setShowMessageView: Function;
};

const RecipientControl = ({ setShowMessageView }: RecipientControlProps): JSX.Element => {
  const client = useXmtpStore((state) => state.client);
  const recipientWalletAddress = useXmtpStore((state) => state.recipientWalletAddress) || '';
  const conversationId = useXmtpStore((state) => state.conversationId);
  const setRecipientWalletAddress = useXmtpStore((state) => state.setRecipientWalletAddress);
  const size = useWindowSize();
  const { isValid, isEns, ensName, ensAddress, isLoading } = useWalletAddress();
  const [recipientInputMode, setRecipientInputMode] = useState(RecipientInputMode.InvalidEntry);
  const conversations = useXmtpStore((state) => state.conversations);
  const setConversations = useXmtpStore((state) => state.setConversations);
  const { address: walletAddress } = useAccount();

  const checkIfOnNetwork = async (address: string) => {
    setRecipientInputMode(RecipientInputMode.Submitted);
    let canMessage;
    if (client) {
      try {
        canMessage = await client.canMessage(address);
        if (!canMessage) {
          setRecipientInputMode(RecipientInputMode.NotOnNetwork);
        } else {
          setRecipientInputMode(RecipientInputMode.OnNetwork);
        }
      } catch (e) {
        setRecipientInputMode(RecipientInputMode.NotOnNetwork);
      }
    }
  };

  const handleSubmit = async () => {
    event?.preventDefault();

    if (isEns) {
      setRecipientInputMode(RecipientInputMode.FindingEntry);
      if (ensAddress) {
        checkIfOnNetwork(ensAddress);
      } else {
        setRecipientInputMode(RecipientInputMode.InvalidEntry);
      }
    } else if (isValidLongWalletAddress(recipientWalletAddress)) {
      checkIfOnNetwork(recipientWalletAddress);
    }
  };

  useEffect(() => {
    if (isValid) {
      handleSubmit();
      setRecipientInputMode(RecipientInputMode.Submitted);
    } else {
      !isLoading && setRecipientInputMode(RecipientInputMode.InvalidEntry);
    }
  }, [isValid, recipientWalletAddress]);

  useEffect(() => {
    const setLookupValue = async () => {
      if (isValid && isEns && ensAddress) {
        const conversation =
          conversationId && conversationId !== ensAddress
            ? await client?.conversations?.newConversation(ensAddress, {
                conversationId,
                metadata: {}
              })
            : await client?.conversations?.newConversation(ensAddress);

        if (conversation) {
          conversations.set(getConversationKey(conversation), conversation);
          setConversations(new Map(conversations));
          setRecipientWalletAddress(conversation.peerAddress);
        }
      } else if (isValid && !isEns && recipientWalletAddress) {
        const conversation =
          conversationId && conversationId !== recipientWalletAddress
            ? await client?.conversations?.newConversation(recipientWalletAddress, {
                conversationId,
                metadata: {}
              })
            : await client?.conversations?.newConversation(recipientWalletAddress);
        if (conversation) {
          conversations.set(getConversationKey(conversation), conversation);
          setConversations(new Map(conversations));
          setRecipientWalletAddress(conversation.peerAddress);
        }
      }
    };
    if (recipientInputMode === RecipientInputMode.OnNetwork) {
      setLookupValue();
    }
  }, [isValid, recipientInputMode, recipientWalletAddress, conversationId]);

  const userIsSender = recipientWalletAddress === walletAddress;

  return (
    <div className="flex-col flex-1">
      <div className="flex-1 flex-col justify-center flex bg-zinc-50 md:border-b md:border-gray-200 md:px-4 md:pb-[2px] max-h-16 min-h-[4rem]">
        <div className="flex items-center">
          {size[0] < 600 && (
            <div className="flex items-center mx-2 w-3 mt-1">
              <BackArrow
                onClick={() => {
                  setShowMessageView(false);
                  setRecipientWalletAddress('');
                }}
              />
            </div>
          )}
          <form
            className="w-full flex pl-2 md:pl-0 h-8 pt-1"
            onSubmit={(e) => e.preventDefault()}
            action="#"
            method="GET"
          >
            <label htmlFor="recipient-field" className="sr-only">
              Recipient
            </label>
            <div className="relative w-full text-n-300 focus-within:text-n-600">
              <div
                className="absolute top-1 left-0 flex items-center pointer-events-none text-md md:text-sm font-medium md:font-semibold"
                data-testid="message-to-key"
              >
                To:
              </div>
              <div className="relative mb-5">
                {isValid && (
                  <span className={recipientPillInputStyle(userIsSender)}>
                    {ensName ?? recipientWalletAddress}
                  </span>
                )}
                <br />
                <AddressInput
                  id="recipient-field"
                  className="block w-[90%] pl-7 pr-3 pt-[3px] md:pt-[2px] md:pt-[1px] bg-transparent caret-n-600 text-n-600 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent text-lg font-mono"
                  onInputChange={(e) => {
                    setRecipientWalletAddress((e.target as HTMLInputElement).value);
                  }}
                  userIsSender={userIsSender}
                  value={ensName ?? recipientWalletAddress}
                  isValid={isValid}
                />
              </div>
              <button type="submit" className="hidden" />
            </div>
          </form>
        </div>
        {recipientInputMode === RecipientInputMode.Submitted ||
        recipientInputMode === RecipientInputMode.OnNetwork ? (
          <div className="text-md text-n-300 text-sm font-mono ml-10 md:ml-8 pb-1 md:pb-[1px]">
            {ensName ? ensAddress ?? recipientWalletAddress : null}
          </div>
        ) : (
          <div
            className="text-sm md:text-xs text-n-300 ml-[29px] pl-2 md:pl-0 pb-1 md:pb-[3px]"
            data-testid="message-to-subtext"
          >
            {recipientInputMode === RecipientInputMode.NotOnNetwork && 'Recipient is not on the XMTP network'}
            {recipientInputMode === RecipientInputMode.FindingEntry && 'Finding ENS domain...'}
            {recipientInputMode === RecipientInputMode.InvalidEntry && 'Please enter a valid wallet address'}
          </div>
        )}
      </div>
      {recipientInputMode === RecipientInputMode.OnNetwork && <Conversation />}
    </div>
  );
};

export default RecipientControl;
