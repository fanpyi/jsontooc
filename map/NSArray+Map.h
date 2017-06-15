//
//  NSArray+Map.h
//  map
//
//  Created by bee on 15/06/2017.
//  Copyright © 2017 bee. All rights reserved.
//

#import <Foundation/Foundation.h>
typedef id (^MapBlock)(id obj,int index);
@interface NSArray (Map)
-(NSArray *)map:(MapBlock)block;
@end
